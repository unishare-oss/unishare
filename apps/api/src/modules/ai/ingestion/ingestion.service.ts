import { Injectable, Logger } from '@nestjs/common'
import { IngestStatus } from '@/generated/prisma/client'
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

    if (!SUPPORTED_MIME_TYPES.includes(file.mimeType)) {
      await this.prisma.file.update({
        where: { id: fileId },
        data: { ingestStatus: IngestStatus.UNSUPPORTED },
      })
      return
    }

    await this.prisma.file.update({
      where: { id: fileId },
      data: { ingestStatus: IngestStatus.PROCESSING, ingestStartedAt: new Date() },
    })

    try {
      const doc = await this.extractor.extractFromKey(file.key, file.mimeType)
      const chunks = chunkDocument(doc)

      if (chunks.length > 0) {
        const vectors = await this.embedding.embedDocuments(chunks.map((c) => c.content))
        await this.replaceChunks(file.postId, file.id, chunks, vectors)
      }

      await this.prisma.file.update({
        where: { id: fileId },
        data: {
          ingestStatus: IngestStatus.READY,
          ingestError: null,
          ingestedAt: new Date(),
        },
      })

      this.logger.log(`Ingested file ${fileId}: ${chunks.length} chunks`)
    } catch (err) {
      const message = (err as Error).message.slice(0, MAX_ERROR_CHARS)
      await this.prisma.file.update({
        where: { id: fileId },
        data: { ingestStatus: IngestStatus.FAILED, ingestError: message },
      })
      this.logger.warn(`Failed to ingest file ${fileId}: ${message}`)
    }
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
