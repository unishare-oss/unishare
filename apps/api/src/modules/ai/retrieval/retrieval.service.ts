import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { EmbeddingService } from '../embedding/embedding.service'
import { toVectorLiteral } from '../embedding/vector-literal'

export const RETRIEVAL_TOP_K = 6

/**
 * Cosine-similarity floor below which the best match is treated as unrelated to the
 * document. CALIBRATED IN TASK 10 against the golden set — do not adjust by intuition.
 * 0.5 is the starting point: for nomic-embed-text, on-topic matches typically land
 * around 0.6-0.8 and unrelated text around 0.3-0.5.
 */
export const MIN_SIMILARITY = 0.5

export interface RetrievedChunk {
  id: string
  content: string
  pageNum: number | null
  similarity: number
}

@Injectable()
export class RetrievalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embedding: EmbeddingService,
  ) {}

  async searchPost(
    postId: string,
    query: string,
    limit: number = RETRIEVAL_TOP_K,
  ): Promise<RetrievedChunk[]> {
    if (!this.embedding.enabled) return []

    const literal = toVectorLiteral(await this.embedding.embedQuery(query))

    // <=> is cosine distance (0 identical, 2 opposite), so similarity is 1 - distance.
    //
    // The join to `file` restricts results to chunks whose owning file finished ingesting.
    // Ingestion commits chunks per embedding batch (so progress is observable), so a run
    // that dies partway leaves committed, fully-embedded chunks behind for a document that
    // is only fractionally indexed — citing those would present a third of a PDF as the
    // whole of it, and the scheduler sweep never reclaims FAILED files.
    //
    // DO NOT "simplify" this by deleting chunks in ingestion's catch block instead. Filtering
    // at read time is correct under ANY partial state, including a hard crash, an OOM kill or
    // a pod eviction, where no catch block ever runs. A cleanup path can only ever be a
    // best-effort supplement to this filter, never a replacement for it.
    //
    // 'READY' is a bare literal, not a bind parameter: Postgres resolves an unknown-typed
    // literal against the "IngestStatus" enum on its own. Parameterising it would need an
    // explicit ${'x'}::"IngestStatus" cast or the comparison is rejected at runtime.
    return this.prisma.$queryRaw<RetrievedChunk[]>`
      SELECT c.id, c.content, c."pageNum", 1 - (c.embedding <=> ${literal}::vector) AS similarity
      FROM post_chunk c
      JOIN file f ON f.id = c."fileId"
      WHERE c."postId" = ${postId}
        AND c.embedding IS NOT NULL
        AND f."ingestStatus" = 'READY'
      ORDER BY c.embedding <=> ${literal}::vector
      LIMIT ${limit}
    `
  }
}
