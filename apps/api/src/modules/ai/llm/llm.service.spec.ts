import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
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
})
