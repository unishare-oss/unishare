import { ConfigService } from '@nestjs/config'
import { LlmChatOptions, LlmMessage, LlmProvider } from '../llm.types'

export class GeminiProvider implements LlmProvider {
  constructor(private readonly config: ConfigService) {}

  async chat(messages: LlmMessage[], options: LlmChatOptions): Promise<string | null> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const genAI = new GoogleGenerativeAI(this.config.getOrThrow('AI_SUMMARY_API_KEY'))
    const model = this.config.get('AI_SUMMARY_MODEL') || 'gemini-2.5-flash'
    // Optional. Set it to send requests through a Gemini-compatible proxy instead of Google's own
    // endpoint; the SDK still appends `/v1beta/models/...`, so the proxy must speak the same API.
    const baseUrl = this.config.get<string>('AI_SUMMARY_BASE_URL') || undefined

    const systemInstruction = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n')
    const turns = messages.filter((m) => m.role !== 'system')

    const genModel = genAI.getGenerativeModel(
      {
        model,
        systemInstruction: systemInstruction || undefined,
        // `maxOutputTokens` was not sent before, so every call could run to the model's own limit.
        // A proxy with a spending cap reserves the worst case up front, which made that costly.
        generationConfig: { temperature: options.temperature, maxOutputTokens: options.maxTokens },
      },
      baseUrl ? { baseUrl } : undefined,
    )

    const history = turns.slice(0, -1).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))
    const last = turns[turns.length - 1]
    if (!last) return null

    const chat = genModel.startChat({ history })
    const result = await chat.sendMessage(last.content)
    return result.response.text().trim() || null
  }
}
