import { ConfigService } from '@nestjs/config'
import { LlmChatOptions, LlmMessage, LlmProvider } from '../llm.types'

export class OllamaProvider implements LlmProvider {
  constructor(private readonly config: ConfigService) {}

  async chat(messages: LlmMessage[], options: LlmChatOptions): Promise<string | null> {
    const endpoint = this.config.get('AI_SUMMARY_ENDPOINT') ?? 'http://localhost:11434'
    const model = this.config.get('AI_SUMMARY_MODEL') || 'llama3.2'

    const response = await fetch(`${endpoint}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        messages,
        options: { num_predict: options.maxTokens, temperature: options.temperature },
      }),
    })

    if (!response.ok) throw new Error(`Ollama responded with ${response.status}`)

    const data = (await response.json()) as { message?: { content?: string } }
    return data.message?.content?.trim() ?? null
  }
}
