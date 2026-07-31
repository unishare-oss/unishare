import { ConfigService } from '@nestjs/config'
import { LlmChatOptions, LlmMessage, LlmProvider } from '../llm.types'

export class GeminiProvider implements LlmProvider {
  constructor(private readonly config: ConfigService) {}

  async chat(messages: LlmMessage[], options: LlmChatOptions): Promise<string | null> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const genAI = new GoogleGenerativeAI(this.config.getOrThrow('AI_SUMMARY_API_KEY'))
    const model = this.config.get('AI_SUMMARY_MODEL') || 'gemini-2.5-flash'

    const systemInstruction = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n')
    const turns = messages.filter((m) => m.role !== 'system')

    const genModel = genAI.getGenerativeModel({
      model,
      systemInstruction: systemInstruction || undefined,
      generationConfig: { temperature: options.temperature },
    })

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
