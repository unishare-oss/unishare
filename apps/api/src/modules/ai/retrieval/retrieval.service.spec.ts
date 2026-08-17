import { Test, TestingModule } from '@nestjs/testing'
import { PrismaService } from '@/prisma/prisma.service'
import { RetrievalService, RETRIEVAL_TOP_K, MIN_SIMILARITY } from './retrieval.service'
import { EmbeddingService } from '../embedding/embedding.service'

describe('RetrievalService', () => {
  let service: RetrievalService
  let prismaMock: any
  let embeddingMock: any

  const rows = [
    { id: 'c1', content: 'alpha', pageNum: 4, similarity: 0.82 },
    { id: 'c2', content: 'bravo', pageNum: 9, similarity: 0.61 },
  ]

  beforeEach(async () => {
    prismaMock = { $queryRaw: jest.fn().mockResolvedValue(rows) }
    embeddingMock = { enabled: true, embedQuery: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]) }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetrievalService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: EmbeddingService, useValue: embeddingMock },
      ],
    }).compile()

    service = module.get(RetrievalService)
  })

  it('embeds the query before searching', async () => {
    await service.searchPost('p1', 'what is on page 4')
    expect(embeddingMock.embedQuery).toHaveBeenCalledWith('what is on page 4')
  })

  it('binds the vector literal, the post id and the limit in that order', async () => {
    await service.searchPost('p1', 'q')

    // Positional, not toContain: the values are bound in SQL order, so a query that
    // swapped `WHERE "postId" = $limit` with `LIMIT $postId` would satisfy a
    // membership check while being completely broken.
    const [, ...values] = prismaMock.$queryRaw.mock.calls[0]
    expect(values).toEqual(['[0.1,0.2,0.3]', 'p1', '[0.1,0.2,0.3]', RETRIEVAL_TOP_K])
  })

  it('orders by cosine distance and excludes rows with no embedding', async () => {
    await service.searchPost('p1', 'q')

    // The SQL text itself is the only thing that can be asserted here — the mock
    // returns whatever we tell it to, so checking the returned order would just be
    // testing the fixture.
    const sql = (prismaMock.$queryRaw.mock.calls[0][0] as string[]).join('?')

    // <=> is cosine distance, the metric the rest of the pipeline assumes. <-> (L2) or
    // <#> (inner product) would rank wrongly — silently, since all three return
    // plausible-looking numbers. Not an index concern: with `WHERE "postId" = $1` the
    // planner usually prefers post_chunk_postId_idx plus a sort, so the HNSW index is not
    // used by this query today (see the migration's own note).
    expect(sql).toContain('<=>')
    expect(sql).not.toContain('<->')
    expect(sql).not.toContain('<#>')
    expect(sql).toMatch(/ORDER BY\s+\w+\.embedding <=>/)

    // Without this filter, chunks whose embedding is still NULL (mid-ingestion) sort
    // last but can still occupy top-k slots on a post with few chunks.
    expect(sql).toMatch(/embedding IS NOT NULL/)

    // similarity must be derived as 1 - distance, not returned as raw distance, or
    // MIN_SIMILARITY in Task 11 compares against an inverted scale.
    expect(sql).toMatch(/1 - \(\w+\.embedding <=>/)
  })

  it('restricts to chunks whose owning file is READY', async () => {
    await service.searchPost('p1', 'q')
    const sql = (prismaMock.$queryRaw.mock.calls[0][0] as string[]).join('?')

    // Text only, and deliberately not the primary evidence for this filter: mutating the
    // `AND` before it into an `OR` — which matches every chunk in the table — satisfies
    // every assertion below. retrieval.integration.spec.ts executes the query against a
    // live pgvector with non-READY rows seeded, and that is what actually pins the meaning.
    expect(sql).toMatch(/JOIN\s+file\s+\w+\s+ON/)
    expect(sql).toMatch(/"ingestStatus" = 'READY'/)
    expect(sql).not.toMatch(/"ingestStatus" (!=|<>)/)
  })

  it('passes the rows through unchanged', async () => {
    const result = await service.searchPost('p1', 'q')
    expect(result).toEqual(rows)
  })

  it('honours an explicit limit', async () => {
    await service.searchPost('p1', 'q', 3)
    const [, ...values] = prismaMock.$queryRaw.mock.calls[0]
    expect(values[values.length - 1]).toBe(3)
  })

  it('returns an empty array without querying when embeddings are disabled', async () => {
    embeddingMock.enabled = false
    const result = await service.searchPost('p1', 'q')
    expect(result).toEqual([])
    expect(prismaMock.$queryRaw).not.toHaveBeenCalled()
  })

  it('exposes a top-k default of 6', () => {
    expect(RETRIEVAL_TOP_K).toBe(6)
  })

  it('keeps MIN_SIMILARITY on the cosine-similarity scale', () => {
    // Task 10 calibrates the exact value, so this deliberately does NOT pin a number —
    // pinning one would break the moment it is calibrated, and someone would "fix" the
    // test rather than think about the value. What it does catch is a value off the
    // scale entirely: `1 - (embedding <=> v)` yields roughly -1..1, so a threshold of 50
    // refuses everything and a negative one accepts everything, both silently.
    expect(MIN_SIMILARITY).toBeGreaterThan(0)
    expect(MIN_SIMILARITY).toBeLessThan(1)
  })
})
