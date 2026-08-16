import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { EmbeddingService } from '../embedding/embedding.service'
import { toVectorLiteral } from '../embedding/vector-literal'

export const RETRIEVAL_TOP_K = 6

/**
 * Cosine-similarity floor below which the best match is treated as too weak to answer FROM.
 *
 * A RETRIEVAL-QUALITY gate, not a refusal gate, and the distinction is the whole point. Nothing
 * refuses a question on the strength of this number. `AiSummaryService.chatWithPost` routes a
 * below-floor result to the full-text fallback — the same route it takes when a post has no
 * indexed chunks at all — because "the best chunk is weak" and "there are no chunks" mean the
 * same thing operationally: retrieval did not help. Refusal there is reachable only through the
 * model-emitted OFF_TOPIC sentinel.
 *
 * It used to refuse, pre-LLM and with no fallback. That put more weight on the number than the
 * measurement below can carry — see warning 1 — so if you are tempted to restore it, read that
 * warning first and then don't.
 *
 * Calibrated 2026-08-14 by retrieval.golden.spec.ts against test/fixtures/golden (18 pages of
 * linear algebra, nomic-embed-text, CHUNK_MAX_CHARS = 2000): the lowest on-topic best match
 * scored 0.675 and the highest off-topic best match scored 0.641. 0.65 sits in that gap,
 * deliberately near the off-topic ceiling — a wrong refusal of a real question is worse for a
 * student than a weak answer to a marginal one.
 *
 * TWO WARNINGS, both load-bearing:
 *
 * 1. That gap is 0.034 wide, and the on-topic side clears it by only 0.025. nomic-embed-text has
 *    a high similarity floor — "What is the capital of France?" still scores 0.509 against a
 *    linear-algebra page — so on- and off-topic bands nearly touch. This threshold is a weak
 *    signal, NOT a reliable off-topic detector, which is exactly why it no longer refuses
 *    anything. The model-emitted OFF_TOPIC sentinel is the only refusal check.
 * 2. The fixture is authored prose: no OCR noise, no tables, no figure captions, uniform
 *    register. Real uploads score lower and more raggedly, so 0.675 is an optimistic floor. The
 *    consequence is now a lost citation rather than a wrongly refused question, which is what
 *    makes the optimism survivable. To find out how often it happens on real uploads, grep the
 *    API logs for "below MIN_SIMILARITY" — chatWithPost warns with the actual peak score.
 *
 * Re-run `RUN_GOLDEN_EVAL=1 pnpm --filter api test -- retrieval.golden` after changing the
 * embedding model or the chunk size, and update the bounds recorded in that spec too.
 */
export const MIN_SIMILARITY = 0.65

export interface RetrievedChunk {
  id: string
  content: string
  pageNum: number | null
  similarity: number
  /** Which document this chunk came from. `pageNum` is meaningless without it on a
   *  multi-file post, because chunkIndex — and therefore pageNum — restarts at 1 per file. */
  fileId: string
  fileName: string
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
      SELECT c.id, c.content, c."pageNum", c."fileId", f.name AS "fileName",
             1 - (c.embedding <=> ${literal}::vector) AS similarity
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
