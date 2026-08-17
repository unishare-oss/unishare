import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { EmbeddingService, DOCUMENT_PREFIX, QUERY_PREFIX } from './embedding.service'

function vector(width = 768, fill = 0.1): number[] {
  return Array.from({ length: width }, () => fill)
}

describe('EmbeddingService', () => {
  const configValues: Record<string, string | undefined> = {}

  async function build() {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmbeddingService,
        { provide: ConfigService, useValue: { get: (k: string) => configValues[k] } },
      ],
    }).compile()
    return module.get<EmbeddingService>(EmbeddingService)
  }

  function mockEmbed(embeddings: number[][]) {
    return jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ embeddings }),
    } as Response)
  }

  beforeEach(() => {
    for (const key of Object.keys(configValues)) delete configValues[key]
    configValues.AI_EMBEDDING_PROVIDER = 'ollama'
    configValues.AI_EMBEDDING_ENDPOINT = 'http://ollama.test:11434'
    configValues.AI_EMBEDDING_MODEL = 'nomic-embed-text'
    configValues.AI_EMBEDDING_DIMENSIONS = '768'
    jest.restoreAllMocks()
  })

  it('is disabled when no provider is configured', async () => {
    delete configValues.AI_EMBEDDING_PROVIDER
    const service = await build()
    expect(service.enabled).toBe(false)
    await expect(service.embedQuery('hi')).rejects.toThrow('not configured')
  })

  it('prefixes indexed text with search_document', async () => {
    const fetchMock = mockEmbed([vector(), vector()])
    const service = await build()
    await service.embedDocuments(['alpha', 'bravo'])

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    expect(fetchMock.mock.calls[0][0]).toBe('http://ollama.test:11434/api/embed')
    expect(body.model).toBe('nomic-embed-text')
    expect(body.input).toEqual([`${DOCUMENT_PREFIX}alpha`, `${DOCUMENT_PREFIX}bravo`])
  })

  it('prefixes queries with search_query and returns a single vector', async () => {
    const fetchMock = mockEmbed([vector()])
    const service = await build()
    const result = await service.embedQuery('what is on page 4')

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    expect(body.input).toEqual([`${QUERY_PREFIX}what is on page 4`])
    expect(result).toHaveLength(768)
  })

  it('batches requests at 32 inputs, splitting 70 into 32/32/6', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation((async (
      _url: string,
      init: RequestInit,
    ) => {
      const body = JSON.parse(init.body as string)
      return {
        ok: true,
        json: async () => ({ embeddings: body.input.map(() => vector()) }),
      } as Response
    }) as unknown as typeof fetch)

    const service = await build()
    const result = await service.embedDocuments(Array.from({ length: 70 }, (_, i) => `t${i}`))

    expect(result).toHaveLength(70)
    expect(fetchMock).toHaveBeenCalledTimes(3)

    // Assert the actual boundary, not just the call count: a batch size other than
    // 32 (e.g. 24 or 35) can also produce 3 calls for 70 inputs, so call-count alone
    // would not catch a wrong BATCH_SIZE. This pins the exact per-call split.
    const batchSizes = fetchMock.mock.calls.map(
      (call) => JSON.parse((call[1] as RequestInit).body as string).input.length,
    )
    expect(batchSizes).toEqual([32, 32, 6])
  })

  it('preserves input order across concurrent batches', async () => {
    jest.spyOn(global, 'fetch').mockImplementation((async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string)
      return {
        ok: true,
        json: async () => ({
          // Encode each input's index into its own vector's values so a reorder or
          // interleave across the concurrently-dispatched batches is detectable —
          // asserting only vector count/width would pass even if batches were shuffled.
          embeddings: body.input.map((text: string) =>
            vector(768, Number(text.replace(DOCUMENT_PREFIX, '').slice(1))),
          ),
        }),
      } as Response
    }) as unknown as typeof fetch)

    const service = await build()
    const result = await service.embedDocuments(Array.from({ length: 40 }, (_, i) => `t${i}`))

    // Every index, not just the boundaries: a shuffle confined to the interior of
    // a batch (e.g. reversing everything but each batch's first/last element)
    // must fail too — checking only result[0] and result[39] would not catch that.
    result.forEach((v, i) => expect(v[0]).toBe(i))
    expect(result).toHaveLength(40)
  })

  it('hands each batch to the handler as it lands, and holds the next window until it has', async () => {
    // The handler is the only way a caller can persist progress mid-document, so its
    // granularity and timing are the contract -- resolving with everything at the end is
    // exactly the shape that made the ingestion progress count permanently 0.
    let fetchCount = 0
    jest.spyOn(global, 'fetch').mockImplementation((async (_url: string, init: RequestInit) => {
      fetchCount++
      const body = JSON.parse(init.body as string)
      return {
        ok: true,
        json: async () => ({ embeddings: body.input.map(() => vector()) }),
      } as Response
    }) as unknown as typeof fetch)

    const seen: { startIndex: number; size: number; fetchesSoFar: number }[] = []
    const service = await build()
    const result = await service.embedDocuments(
      Array.from({ length: 70 }, (_, i) => `t${i}`),
      async (vectors, startIndex) => {
        seen.push({ startIndex, size: vectors.length, fetchesSoFar: fetchCount })
      },
    )

    expect(result).toHaveLength(70)

    // Sorted rather than asserted in arrival order: two batches of a window are genuinely
    // concurrent, so which handler runs first is not a contract.
    const byIndex = [...seen].sort((a, b) => a.startIndex - b.startIndex)
    expect(byIndex.map((s) => [s.startIndex, s.size])).toEqual([
      [0, 32],
      [32, 32],
      [64, 6],
    ])

    // fetchesSoFar pins both halves of the contract without depending on arrival order:
    // both batches of window 1 were dispatched before either handler ran (concurrency is
    // preserved, not serialised down to one request at a time), and window 2's request was
    // not dispatched until both had run (the handler is awaited, so a slow consumer applies
    // backpressure instead of letting unflushed vectors pile up).
    expect(byIndex.map((s) => s.fetchesSoFar)).toEqual([2, 2, 3])
    expect(seen.at(-1)?.startIndex).toBe(64)
  })

  it('rejects when the batch handler rejects', async () => {
    mockEmbed([vector()])
    const service = await build()

    await expect(
      service.embedDocuments(['a'], async () => {
        throw new Error('chunk write failed')
      }),
    ).rejects.toThrow('chunk write failed')
  })

  it('rejects a vector whose width does not match the configured dimensions', async () => {
    mockEmbed([vector(512)])
    const service = await build()
    await expect(service.embedQuery('hi')).rejects.toThrow(
      'Embedding width mismatch: expected 768, got 512',
    )
  })

  it('rejects a wrong-width vector even when it is not the first in the batch', async () => {
    // The bad vector is at index 1. A validator that only checks embeddings[0]
    // would pass this, which is precisely the mutation the suite must catch.
    mockEmbed([vector(768), vector(512)])
    const service = await build()

    await expect(service.embedDocuments(['a', 'b'])).rejects.toThrow(
      'Embedding width mismatch: expected 768, got 512',
    )
  })

  it('rejects a response with the wrong number of embeddings', async () => {
    mockEmbed([vector()])
    const service = await build()
    await expect(service.embedDocuments(['a', 'b'])).rejects.toThrow('Expected 2 embeddings')
  })

  it('throws on a non-ok response', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 500 } as Response)
    const service = await build()
    await expect(service.embedQuery('hi')).rejects.toThrow('500')
  })

  it('never exceeds the concurrent batch ceiling', async () => {
    let inFlight = 0
    let maxInFlight = 0

    jest.spyOn(global, 'fetch').mockImplementation((async (_url: string, init: RequestInit) => {
      inFlight++
      maxInFlight = Math.max(maxInFlight, inFlight)
      await new Promise((resolve) => setTimeout(resolve, 5))
      inFlight--
      const body = JSON.parse(init.body as string)
      return {
        ok: true,
        json: async () => ({ embeddings: body.input.map(() => vector()) }),
      } as Response
    }) as unknown as typeof fetch)

    const service = await build()
    // 5 batches of 32 from 160 inputs, so the ceiling is actually exercised.
    await service.embedDocuments(Array.from({ length: 160 }, (_, i) => `t${i}`))

    // MAX_CONCURRENT_BATCHES is not exported from embedding.service.ts, so this is
    // hardcoded to 2 deliberately: if the constant changes, this assertion should
    // break loudly and force someone to revisit it, rather than silently drifting.
    expect(maxInFlight).toBeGreaterThan(0)
    expect(maxInFlight).toBeLessThanOrEqual(2)
  })
})
