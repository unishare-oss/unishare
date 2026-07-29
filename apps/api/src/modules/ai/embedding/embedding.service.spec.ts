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

    expect(result[0][0]).toBe(0)
    expect(result[39][0]).toBe(39)
  })

  it('rejects a vector whose width does not match the configured dimensions', async () => {
    mockEmbed([vector(512)])
    const service = await build()
    await expect(service.embedQuery('hi')).rejects.toThrow(
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
})
