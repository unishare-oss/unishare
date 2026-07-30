import { Injectable, Logger } from '@nestjs/common'
import { IngestStatus, Prisma } from '@/generated/prisma/client'
import { PrismaService } from '@/prisma/prisma.service'
import {
  DocumentExtractorService,
  SUPPORTED_MIME_TYPES,
} from '../extraction/document-extractor.service'
import { EmbeddingService } from '../embedding/embedding.service'
import { toVectorLiteral } from '../embedding/vector-literal'
import { Chunk, chunkDocument } from '../chunking/chunker'

const MAX_ERROR_CHARS = 500
const TRANSACTION_TIMEOUT_MS = 30_000

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly extractor: DocumentExtractorService,
    private readonly embedding: EmbeddingService,
  ) {}

  async ingestFile(fileId: string): Promise<void> {
    if (!this.embedding.enabled) return

    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      select: { id: true, key: true, mimeType: true, postId: true },
    })
    if (!file) return

    // Everything below can outlive the File row: FilesService.remove() hard-deletes it,
    // and it cascades away if the parent Post is deleted, both reachable while this
    // fire-and-forget ingestion is still mid S3-download or mid-Ollama round-trip. Every
    // status write below goes through setStatus (updateMany, not update) so a vanished
    // row can never throw P2025 -- there is no unhandledRejection handler on this path,
    // and an escaped rejection here takes the whole process down.
    try {
      if (!SUPPORTED_MIME_TYPES.includes(file.mimeType)) {
        await this.setStatus(fileId, { ingestStatus: IngestStatus.UNSUPPORTED })
        return
      }

      await this.setStatus(fileId, {
        ingestStatus: IngestStatus.PROCESSING,
        ingestStartedAt: new Date(),
      })

      const doc = await this.extractor.extractFromKey(file.key, file.mimeType)
      const chunks = chunkDocument(doc)

      if (chunks.length > 0) {
        const vectors = await this.embedding.embedDocuments(chunks.map((c) => c.content))
        await this.replaceChunks(file.postId, file.id, chunks, vectors)
      }

      await this.setStatus(fileId, {
        ingestStatus: IngestStatus.READY,
        ingestError: null,
        ingestedAt: new Date(),
      })

      this.logger.log(`Ingested file ${fileId}: ${chunks.length} chunks`)
    } catch (err) {
      const message = (err as Error).message.slice(0, MAX_ERROR_CHARS)
      await this.setStatus(fileId, { ingestStatus: IngestStatus.FAILED, ingestError: message })
      this.logger.warn(`Failed to ingest file ${fileId}: ${message}`)
    }
  }

  /**
   * Status writes go through updateMany, not update: the row can legitimately vanish
   * mid-ingestion (FilesService.remove hard-deletes, and File cascades from Post), and
   * update() throws P2025 when it does. Ingestion is dispatched fire-and-forget with no
   * unhandledRejection handler, so an escaped rejection would take the process down.
   * A missing row means there is nothing left to record -- count 0 is the correct outcome.
   */
  private async setStatus(fileId: string, data: Prisma.FileUpdateManyMutationInput): Promise<void> {
    await this.prisma.file.updateMany({ where: { id: fileId }, data })
  }

  async ingestPost(postId: string): Promise<void> {
    const files = await this.prisma.file.findMany({
      where: { postId },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    })
    for (const file of files) {
      await this.ingestFile(file.id)
    }
  }

  private async replaceChunks(
    postId: string,
    fileId: string,
    chunks: Chunk[],
    vectors: number[][],
  ): Promise<void> {
    await this.prisma.$transaction(
      async (tx) => {
        // Re-ingestion replaces wholesale rather than diffing: chunk boundaries shift
        // when a document changes, so index-wise reconciliation has no meaning.
        await tx.postChunk.deleteMany({ where: { fileId } })

        await tx.postChunk.createMany({
          data: chunks.map((chunk) => ({
            postId,
            fileId,
            chunkIndex: chunk.chunkIndex,
            content: chunk.content,
            pageNum: chunk.pageNum,
          })),
        })

        // Prisma cannot write Unsupported("vector"), so embeddings go in as a second
        // pass keyed by the @@unique([fileId, chunkIndex]) pair. createMany above
        // supplies the cuid ids, which raw SQL could not.
        for (const [index, chunk] of chunks.entries()) {
          await tx.$executeRaw`
            UPDATE post_chunk
            SET embedding = ${toVectorLiteral(vectors[index])}::vector
            WHERE "fileId" = ${fileId} AND "chunkIndex" = ${chunk.chunkIndex}
          `
        }
      },
      { timeout: TRANSACTION_TIMEOUT_MS },
    )
  }
}
