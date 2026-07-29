import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { LlmChatOptions, LlmMessage, LlmProvider } from './llm.types'
import { GroqProvider } from './providers/groq.provider'
import { GeminiProvider } from './providers/gemini.provider'
import { OllamaProvider } from './providers/ollama.provider'

export type LlmProviderName = 'groq' | 'gemini' | 'ollama'

const DEFAULT_MAX_TOKENS = 600
const DEFAULT_TEMPERATURE = 0

@Injectable()
export class LlmService {
  private readonly provider: LlmProvider | null

  constructor(private readonly config: ConfigService) {
    const name = (config.get<string>('AI_SUMMARY_PROVIDER') as LlmProviderName) || null
    this.provider = name ? this.build(name) : null
  }

  get enabled(): boolean {
    return this.provider !== null
  }

  async chat(messages: LlmMessage[], options: LlmChatOptions = {}): Promise<string | null> {
    if (!this.provider) return null
    return this.provider.chat(messages, {
      maxTokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature: options.temperature ?? DEFAULT_TEMPERATURE,
    })
  }

  private build(name: LlmProviderName): LlmProvider | null {
    switch (name) {
      case 'groq':
        return new GroqProvider(this.config)
      case 'gemini':
        return new GeminiProvider(this.config)
      case 'ollama':
        return new OllamaProvider(this.config)
      default:
        return null
    }
  }
}
