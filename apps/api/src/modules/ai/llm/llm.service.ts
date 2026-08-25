import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { LlmChatOptions, LlmMessage, LlmProvider } from './llm.types'
import { GroqProvider } from './providers/groq.provider'
import { GeminiProvider } from './providers/gemini.provider'
import { OllamaProvider } from './providers/ollama.provider'

export type LlmProviderName = 'groq' | 'gemini' | 'ollama'

const DEFAULT_MAX_TOKENS = 600
const DEFAULT_TEMPERATURE = 0

const MAX_ATTEMPTS = 3
const RETRY_BASE_DELAY_MS = 500

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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
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
    const resolved = {
      maxTokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature: options.temperature ?? DEFAULT_TEMPERATURE,
    }

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        return await this.provider.chat(messages, resolved)
      } catch (err) {
        if (!isTransientProviderError(err)) throw err

        // A rate-limited provider used to escape as the raw SDK error, which the global filter
        // turned into a 500 "Internal server error" and the UI rendered as "Something went wrong".
        // It is neither a server fault nor a bad request — it is a budget that refills. Observed
        // on dev: one large upload exhausted a Groq free-tier minute and every chat 500'd until
        // it rolled over, with nothing telling the student to simply wait. A short exponential
        // backoff absorbs the common case (a burst that clears within a second or two) instead of
        // failing the very first request that lands on an exhausted budget.
        if (attempt === MAX_ATTEMPTS) {
          this.logger.warn(`AI provider is rate limited or unavailable: ${(err as Error).message}`)
          throw new ServiceUnavailableException('The AI service is busy. Please try again shortly.')
        }
        this.logger.warn(
          `AI provider transient error (attempt ${attempt}/${MAX_ATTEMPTS}), retrying: ${(err as Error).message}`,
        )
        await delay(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1))
      }
    }
    return null
  }

  /**
   * `chat`, delivered incrementally.
   *
   * Providers without streaming support are NOT excluded — they yield the finished reply as one
   * delta, so every caller sees the same event shape and the fallback is invisible from the
   * outside. Today Groq and Ollama stream; Gemini takes the fallback.
   *
   * The try/catch spans the whole generator rather than just its first `await`, because that is
   * the difference this method exists to get right: a 429 arriving after fifty tokens is exactly
   * as transient as one arriving before the first, and left unmapped it would reach the student
   * as a half-written answer that simply stopped.
   *
   * Retries only kick in before the first delta is yielded — once content has reached the caller,
   * restarting the generator would replay or duplicate output it already emitted, so a transient
   * error past that point still fails immediately.
   */
  async *chatStream(
    messages: LlmMessage[],
    options: LlmChatOptions = {},
  ): AsyncGenerator<string, void> {
    if (!this.provider) return

    const resolved = {
      maxTokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature: options.temperature ?? DEFAULT_TEMPERATURE,
    }

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let yieldedAny = false
      try {
        if (!this.provider.chatStream) {
          const reply = await this.provider.chat(messages, resolved)
          if (reply) yield reply
          return
        }

        for await (const delta of this.provider.chatStream(messages, resolved)) {
          yieldedAny = true
          yield delta
        }
        return
      } catch (err) {
        if (!isTransientProviderError(err)) throw err

        if (yieldedAny || attempt === MAX_ATTEMPTS) {
          this.logger.warn(`AI provider is rate limited or unavailable: ${(err as Error).message}`)
          throw new ServiceUnavailableException('The AI service is busy. Please try again shortly.')
        }
        this.logger.warn(
          `AI provider transient error before any output (attempt ${attempt}/${MAX_ATTEMPTS}), retrying: ${(err as Error).message}`,
        )
        await delay(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1))
      }
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
