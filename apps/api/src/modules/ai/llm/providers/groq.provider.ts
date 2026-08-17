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

  /**
   * Deltas are yielded RAW — no per-delta `trim()`.
   *
   * `chat` trims the whole reply once, which is correct for a complete string. Trimming each
   * delta would delete the spaces BETWEEN tokens, and a reply reassembled from those deltas
   * would read `Aneigenvalueisascalar`. Leading whitespace on the first delta is instead handled
   * where it matters — the sentinel gate mirrors the batch predicate's `.trim()` when deciding.
   */
  async *chatStream(messages: LlmMessage[], options: LlmChatOptions): AsyncIterable<string> {
    const { default: Groq } = await import('groq-sdk')
    const client = new Groq({ apiKey: this.config.getOrThrow('AI_SUMMARY_API_KEY') })
    const model = this.config.get('AI_SUMMARY_MODEL') || 'llama-3.3-70b-versatile'

    const stream = await client.chat.completions.create({
      model,
      messages,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      stream: true,
    })

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content
      if (delta) yield delta
    }
  }
}
