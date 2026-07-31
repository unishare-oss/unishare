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

/**
 * Ceiling on rows written per append transaction.
 *
 * EmbeddingService already hands work back one batch at a time (32 chunks today), so this
 * normally never splits anything. It is here so the bound is owned by the code that owns the
 * transaction: TRANSACTION_TIMEOUT_MS must bound a *fixed* amount of work, and without a cap
 * here that guarantee would silently depend on a constant in another file. Raising
 * EmbeddingService's BATCH_SIZE must not be able to push a 500-chunk document into one
 * 30-second transaction.
 *
 * Deliberately far above 1: a transaction per chunk would mean a BEGIN/COMMIT round trip for
 * every ~2000 characters of document, which is pointless chatter for no extra visibility —
 * nothing observes progress at finer than embedding-batch granularity anyway.
 */
const CHUNK_WRITE_BATCH_SIZE = 32

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

      // Deleted exactly once, up front, before a single embedding is requested.
      //
      // Re-ingestion replaces wholesale rather than diffing: chunk boundaries shift when a
      // document changes, so index-wise reconciliation has no meaning. Hoisting the delete out
      // of the write path is also what makes partial progress safe. If we fail after batch 3
      // of 9, those three batches stay behind -- but no attempt can ever read or extend them,
      // because the next attempt deletes for this file before writing anything. The row set
      // for a file is therefore always the product of exactly one run, never a blend of two.
      //
      // Unconditional, including when chunking now yields nothing: a document that used to
      // index and no longer does must not leave the previous run's chunks queryable.
      await this.prisma.postChunk.deleteMany({ where: { fileId: file.id } })

      if (chunks.length > 0) {
        // Each embedding batch is persisted in its own transaction the moment it lands, so
        // the count of visible post_chunk rows genuinely climbs while the file is PROCESSING.
        // The progress notice polls that count; when all N rows appeared in the same instant
        // the status flipped to READY, the only value it could ever read was 0.
        // The resolved return value is deliberately ignored -- appendChunks already wrote it.
        await this.embedding.embedDocuments(
          chunks.map((c) => c.content),
          (vectors, startIndex) =>
            this.appendChunks(
              file.postId,
              file.id,
              chunks.slice(startIndex, startIndex + vectors.length),
              vectors,
            ),
        )
      }

      // Only now, with every batch committed. A READY write that raced ahead of the last
      // batch would tell the UI to stop polling while rows were still arriving.
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
      // One bad file must not abort the batch: a connection blip on file N shouldn't
      // stop files N+1..end from ever being attempted, and shouldn't reject ingestPost
      // itself into a caller that may not be awaiting it any more carefully than
      // FilesService does.
      await this.ingestFile(file.id).catch((err: Error) => {
        this.logger.warn(`Skipping file ${file.id} in post ${postId}: ${err.message}`)
      })
    }
  }

  /**
   * Appends one already-embedded group of chunks. Append, not replace: the delete happens
   * once in ingestFile before any embedding starts, so nothing here may remove rows -- a
   * delete in this path would wipe every batch that came before it.
   *
   * Rows and their embeddings go in together per transaction, so a chunk is never briefly
   * visible with a NULL embedding (retrieval filters those out, but a row that is counted as
   * "indexed" while unsearchable is a lie the progress notice would repeat).
   */
  private async appendChunks(
    postId: string,
    fileId: string,
    chunks: Chunk[],
    vectors: number[][],
  ): Promise<void> {
    for (let start = 0; start < chunks.length; start += CHUNK_WRITE_BATCH_SIZE) {
      const group = chunks.slice(start, start + CHUNK_WRITE_BATCH_SIZE)
      const groupVectors = vectors.slice(start, start + CHUNK_WRITE_BATCH_SIZE)

      await this.prisma.$transaction(
        async (tx) => {
          await tx.postChunk.createMany({
            data: group.map((chunk) => ({
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
          for (const [index, chunk] of group.entries()) {
            await tx.$executeRaw`
              UPDATE post_chunk
              SET embedding = ${toVectorLiteral(groupVectors[index])}::vector
              WHERE "fileId" = ${fileId} AND "chunkIndex" = ${chunk.chunkIndex}
            `
          }
        },
        { timeout: TRANSACTION_TIMEOUT_MS },
      )
    }
  }
}
