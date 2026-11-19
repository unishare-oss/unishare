import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { ServiceUnavailableException } from '@nestjs/common'
import { LlmService } from './llm.service'

const mockSendMessage = jest.fn()
const mockStartChat = jest.fn(() => ({ sendMessage: mockSendMessage }))
const mockGetGenerativeModel = jest.fn(() => ({ startChat: mockStartChat }))
const mockGoogleGenerativeAI = jest.fn(() => ({ getGenerativeModel: mockGetGenerativeModel }))

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: mockGoogleGenerativeAI,
}))

describe('LlmService', () => {
  let service: LlmService
  const configValues: Record<string, string | undefined> = {}

  async function build() {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LlmService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => configValues[key],
            getOrThrow: (key: string) => {
              const value = configValues[key]
              if (!value) throw new Error(`Missing ${key}`)
              return value
            },
          },
        },
      ],
    }).compile()
    return module.get<LlmService>(LlmService)
  }

  beforeEach(() => {
    for (const key of Object.keys(configValues)) delete configValues[key]
    jest.restoreAllMocks()
  })

  it('reports disabled when no provider is configured', async () => {
    service = await build()
    expect(service.enabled).toBe(false)
  })

  it('returns null from chat when disabled', async () => {
    service = await build()
    await expect(service.chat([{ role: 'user', content: 'hi' }])).resolves.toBeNull()
  })

  describe('ollama provider', () => {
    beforeEach(() => {
      configValues.AI_SUMMARY_PROVIDER = 'ollama'
      configValues.AI_SUMMARY_ENDPOINT = 'http://ollama.test:11434'
      configValues.AI_SUMMARY_MODEL = 'llama3.2'
    })

    it('sends all messages and returns the trimmed reply', async () => {
      const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ message: { content: '  hello  ' } }),
      } as Response)

      service = await build()
      const reply = await service.chat(
        [
          { role: 'system', content: 'be brief' },
          { role: 'user', content: 'hi' },
        ],
        { maxTokens: 120, temperature: 0 },
      )

      expect(reply).toBe('hello')
      const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
      expect(fetchMock.mock.calls[0][0]).toBe('http://ollama.test:11434/api/chat')
      expect(body.messages).toEqual([
        { role: 'system', content: 'be brief' },
        { role: 'user', content: 'hi' },
      ])
      expect(body.options).toEqual({ num_predict: 120, temperature: 0 })
      expect(body.stream).toBe(false)
    })

    it('throws when the provider responds with a non-ok status', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 503 } as Response)
      service = await build()
      await expect(service.chat([{ role: 'user', content: 'hi' }])).rejects.toThrow('503')
    })
  })

  describe('gemini provider', () => {
    beforeEach(() => {
      configValues.AI_SUMMARY_PROVIDER = 'gemini'
      configValues.AI_SUMMARY_API_KEY = 'test-key'
      mockGoogleGenerativeAI.mockClear()
      mockGetGenerativeModel.mockClear()
      mockStartChat.mockClear()
      mockSendMessage.mockReset()
      mockSendMessage.mockResolvedValue({ response: { text: () => '  quiz json  ' } })
    })

    // Regression: the original callGemini(systemPrompt, userContent) always sent a
    // (possibly empty-string) user turn, so it always reached the Gemini API. A
    // call site that sends only a system message with no user turn at all makes
    // GeminiProvider's `turns` array empty, and it short-circuits to null before
    // ever calling the SDK. Callers that need a system-only prompt (e.g. quiz
    // generation) must include an explicit empty-content user turn to preserve
    // that behaviour -- this test proves such a turn reaches `sendMessage`
    // instead of being dropped.
    it('reaches sendMessage with an empty-content user turn instead of short-circuiting', async () => {
      service = await build()
      const reply = await service.chat(
        [
          { role: 'system', content: 'system prompt' },
          { role: 'user', content: '' },
        ],
        { maxTokens: 300, temperature: 0 },
      )

      expect(mockSendMessage).toHaveBeenCalledWith('')
      expect(reply).toBe('quiz json')
    })
  })

  describe('a rate-limited provider is retryable, not a server fault', () => {
    beforeEach(() => {
      configValues.AI_SUMMARY_PROVIDER = 'ollama'
      configValues.AI_SUMMARY_ENDPOINT = 'http://ollama.test:11434'
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    /** Fails every provider call with an SDK-shaped error carrying an HTTP status. */
    function providerFailsWith(status: number) {
      jest.spyOn(global, 'fetch' as never).mockImplementation((() => {
        const err = new Error(`provider said ${status}`) as Error & { status: number }
        err.status = status
        return Promise.reject(err)
      }) as never)
    }

    // 413 is the one that actually bit: Groq answers "Request too large ... tokens per minute"
    // with a 413, so treating it as a client error would blame a request that was fine.
    it.each([429, 413, 500, 503])('maps %i to ServiceUnavailableException', async (status) => {
      providerFailsWith(status)
      service = await build()

      const assertion = expect(
        service.chat([{ role: 'user', content: 'hi' }]),
      ).rejects.toBeInstanceOf(ServiceUnavailableException)
      await jest.runAllTimersAsync()
      await assertion
    })

    it('leaves a genuine client error alone', async () => {
      // The mapping must be narrow. A 400 means the request really was malformed, and hiding it
      // behind "the AI service is busy" would send someone looking in the wrong place.
      const fetchMock = jest.spyOn(global, 'fetch' as never)
      providerFailsWith(400)
      service = await build()

      await expect(service.chat([{ role: 'user', content: 'hi' }])).rejects.not.toBeInstanceOf(
        ServiceUnavailableException,
      )
      // Not transient, so it must fail on the first attempt rather than burning retries.
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('says the service is busy rather than leaking the provider message', async () => {
      providerFailsWith(429)
      service = await build()

      const assertion = expect(service.chat([{ role: 'user', content: 'hi' }])).rejects.toThrow(
        /busy/i,
      )
      await jest.runAllTimersAsync()
      await assertion
    })

    it('retries a transient failure and returns the result once the provider recovers', async () => {
      const fetchMock = jest.spyOn(global, 'fetch')
      fetchMock.mockRejectedValueOnce(
        Object.assign(new Error('provider said 429'), { status: 429 }),
      )
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: { content: 'recovered' } }),
      } as Response)
      service = await build()

      const promise = service.chat([{ role: 'user', content: 'hi' }])
      await jest.runAllTimersAsync()

      await expect(promise).resolves.toBe('recovered')
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('gives up after exhausting all attempts against a provider that never recovers', async () => {
      const fetchMock = jest.spyOn(global, 'fetch' as never)
      providerFailsWith(429)
      service = await build()

      const assertion = expect(
        service.chat([{ role: 'user', content: 'hi' }]),
      ).rejects.toBeInstanceOf(ServiceUnavailableException)
      await jest.runAllTimersAsync()
      await assertion

      expect(fetchMock).toHaveBeenCalledTimes(3)
    })
  })

  describe('chatStream', () => {
    /** Everything the stream yielded, in order. */
    async function drain(stream: AsyncIterable<string>): Promise<string[]> {
      const deltas: string[] = []
      for await (const delta of stream) deltas.push(delta)
      return deltas
    }

    /** A fetch that answers with an NDJSON body delivered in the given byte slices. */
    function ollamaStreams(slices: (string | Uint8Array)[], status = 200) {
      const encoder = new TextEncoder()
      const queue = slices.map((s) => (typeof s === 'string' ? encoder.encode(s) : s))
      let index = 0

      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: status < 400,
        status,
        body: {
          getReader: () => ({
            read: async () =>
              index < queue.length
                ? { done: false, value: queue[index++] }
                : { done: true, value: undefined },
            cancel: async () => undefined,
          }),
        },
      } as unknown as Response)
    }

    describe('ollama', () => {
      beforeEach(() => {
        configValues.AI_SUMMARY_PROVIDER = 'ollama'
        configValues.AI_SUMMARY_ENDPOINT = 'http://ollama.test:11434'
      })

      it('yields each NDJSON fragment as it arrives', async () => {
        ollamaStreams([
          '{"message":{"content":"An "}}\n',
          '{"message":{"content":"eigenvalue"}}\n',
          '{"message":{"content":"."}}\n{"done":true}\n',
        ])
        service = await build()

        // Asserted as separate deltas, not as a joined string: joining would pass just as well
        // if the provider buffered the whole reply and yielded it once at the end.
        expect(await drain(service.chatStream([{ role: 'user', content: 'hi' }]))).toEqual([
          'An ',
          'eigenvalue',
          '.',
        ])
      })

      it('asks the provider to stream', async () => {
        ollamaStreams(['{"message":{"content":"hi"}}\n'])
        service = await build()
        await drain(service.chatStream([{ role: 'user', content: 'hi' }], { maxTokens: 120 }))

        const body = JSON.parse(
          (jest.mocked(global.fetch).mock.calls[0][1] as RequestInit).body as string,
        )
        expect(body.stream).toBe(true)
        expect(body.options.num_predict).toBe(120)
      })

      it('reassembles a JSON object split across two reads', async () => {
        // Network chunks do not respect line boundaries. Parsing per-read would throw here and
        // lose the fragment.
        ollamaStreams(['{"message":{"con', 'tent":"split"}}\n'])
        service = await build()

        expect(await drain(service.chatStream([{ role: 'user', content: 'hi' }]))).toEqual([
          'split',
        ])
      })

      it('reassembles a multi-byte character split across two reads', async () => {
        // The em dash the server's own prompts use is three bytes. Decoding each read
        // independently turns a split one into replacement characters.
        const bytes = new TextEncoder().encode('{"message":{"content":"—"}}\n')
        ollamaStreams([bytes.slice(0, 23), bytes.slice(23)])
        service = await build()

        expect(await drain(service.chatStream([{ role: 'user', content: 'hi' }]))).toEqual(['—'])
      })

      it('maps a rate-limited stream to ServiceUnavailableException', async () => {
        jest.useFakeTimers()
        ollamaStreams([], 429)
        service = await build()

        const assertion = expect(
          drain(service.chatStream([{ role: 'user', content: 'hi' }])),
        ).rejects.toBeInstanceOf(ServiceUnavailableException)
        await jest.runAllTimersAsync()
        await assertion
        jest.useRealTimers()
      })

      it('retries a stream that fails before yielding anything, then succeeds', async () => {
        jest.useFakeTimers()
        const fetchMock = jest.spyOn(global, 'fetch')
        fetchMock.mockResolvedValueOnce({ ok: false, status: 429 } as Response)
        ollamaStreams(['{"message":{"content":"recovered"}}\n'])
        service = await build()

        const promise = drain(service.chatStream([{ role: 'user', content: 'hi' }]))
        await jest.runAllTimersAsync()

        await expect(promise).resolves.toEqual(['recovered'])
        expect(fetchMock).toHaveBeenCalledTimes(2)
        jest.useRealTimers()
      })

      it('does not retry once a delta has already reached the caller', async () => {
        // A retry here would replay content the caller already received. Once a chunk of the
        // reply has gone out, a transient error must fail immediately instead of restarting.
        const encoder = new TextEncoder()
        let reads = 0
        const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
          ok: true,
          status: 200,
          body: {
            getReader: () => ({
              read: async () => {
                reads++
                if (reads === 1) {
                  return {
                    done: false,
                    value: encoder.encode('{"message":{"content":"partial"}}\n'),
                  }
                }
                throw Object.assign(new Error('dropped mid-stream'), { status: 429 })
              },
              cancel: async () => undefined,
            }),
          },
        } as unknown as Response)
        service = await build()

        const deltas: string[] = []
        await expect(
          (async () => {
            for await (const delta of service.chatStream([{ role: 'user', content: 'hi' }])) {
              deltas.push(delta)
            }
          })(),
        ).rejects.toBeInstanceOf(ServiceUnavailableException)

        expect(deltas).toEqual(['partial'])
        expect(fetchMock).toHaveBeenCalledTimes(1)
      })
    })

    describe('a provider without streaming support', () => {
      beforeEach(() => {
        configValues.AI_SUMMARY_PROVIDER = 'gemini'
        configValues.AI_SUMMARY_API_KEY = 'test-key'
        mockSendMessage.mockReset()
        mockSendMessage.mockResolvedValue({ response: { text: () => 'the whole answer' } })
      })

      it('falls back to one delta carrying the complete reply', async () => {
        // The fallback has to be invisible: same event shape, same text, just delivered at once.
        service = await build()

        expect(await drain(service.chatStream([{ role: 'user', content: 'hi' }]))).toEqual([
          'the whole answer',
        ])
      })

      it('maps a transient failure the same way the streaming providers do', async () => {
        jest.useFakeTimers()
        mockSendMessage.mockRejectedValue(Object.assign(new Error('rate limited'), { status: 429 }))
        service = await build()

        const assertion = expect(
          drain(service.chatStream([{ role: 'user', content: 'hi' }])),
        ).rejects.toBeInstanceOf(ServiceUnavailableException)
        await jest.runAllTimersAsync()
        await assertion
        jest.useRealTimers()
      })
    })

    it('yields nothing when no provider is configured', async () => {
      service = await build()
      expect(await drain(service.chatStream([{ role: 'user', content: 'hi' }]))).toEqual([])
    })
  })
})
