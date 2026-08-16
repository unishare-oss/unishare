import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { LlmChatOptions, LlmMessage, LlmProvider } from './llm.types'
import { GroqProvider } from './providers/groq.provider'
import { GeminiProvider } from './providers/gemini.provider'
import { OllamaProvider } from './providers/ollama.provider'

export type LlmProviderName = 'groq' | 'gemini' | 'ollama'

const DEFAULT_MAX_TOKENS = 600
const DEFAULT_TEMPERATURE = 0

/**
 * Provider statuses that mean "ask again later", not "your request was wrong".
 *
 * 429 is the usual rate limit. 413 is Groq's: it returns "Request too large ... tokens per
 * minute (TPM)" with a 413, so treating 413 as a client error would be wrong — the request was
 * fine, the budget was not. 5xx is the provider being down.
 */
function isTransientProviderError(err: unknown): boolean {
  const status = (err as { status?: number })?.status
  return status === 429 || status === 413 || (typeof status === 'number' && status >= 500)
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name)
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
    try {
      return await this.provider.chat(messages, {
        maxTokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: options.temperature ?? DEFAULT_TEMPERATURE,
      })
    } catch (err) {
      // A rate-limited provider used to escape as the raw SDK error, which the global filter
      // turned into a 500 "Internal server error" and the UI rendered as "Something went wrong".
      // It is neither a server fault nor a bad request — it is a budget that refills. Observed on
      // dev: one large upload exhausted a Groq free-tier minute and every chat 500'd until it
      // rolled over, with nothing telling the student to simply wait.
      if (isTransientProviderError(err)) {
        this.logger.warn(`AI provider is rate limited or unavailable: ${(err as Error).message}`)
        throw new ServiceUnavailableException('The AI service is busy. Please try again shortly.')
      }
      throw err
    }
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
