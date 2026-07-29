import { ConfigService } from '@nestjs/config'
import { LlmChatOptions, LlmMessage, LlmProvider } from '../llm.types'

export class GroqProvider implements LlmProvider {
  constructor(private readonly config: ConfigService) {}

  async chat(messages: LlmMessage[], options: LlmChatOptions): Promise<string | null> {
    const { default: Groq } = await import('groq-sdk')
    const client = new Groq({ apiKey: this.config.getOrThrow('AI_SUMMARY_API_KEY') })
    const model = this.config.get('AI_SUMMARY_MODEL') || 'llama-3.3-70b-versatile'

    const response = await client.chat.completions.create({
      model,
      messages,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
    })

    return response.choices[0]?.message?.content?.trim() ?? null
  }
}
