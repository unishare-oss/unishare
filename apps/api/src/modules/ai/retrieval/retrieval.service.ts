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
    return this.prisma.$queryRaw<RetrievedChunk[]>`
      SELECT id, content, "pageNum", 1 - (embedding <=> ${literal}::vector) AS similarity
      FROM post_chunk
      WHERE "postId" = ${postId} AND embedding IS NOT NULL
      ORDER BY embedding <=> ${literal}::vector
      LIMIT ${limit}
    `
  }
}
