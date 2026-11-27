import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { LlmChatOptions, LlmMessage, LlmProvider } from '../llm.types'

/**
 * Output tokens added on top of each caller's budget, for the model's thinking.
 *
 * Gemini counts thinking tokens against `maxOutputTokens`. Callers size their budgets for the
 * answer alone (600 for a chat reply, 80 for a rewritten query), so a model that thinks first can
 * spend the whole budget before it writes, and the answer stops after a few words. Override with
 * AI_SUMMARY_THINKING_HEADROOM; 0 turns it off.
 */
export const DEFAULT_THINKING_HEADROOM = 2048

export class GeminiProvider implements LlmProvider {
  private readonly logger = new Logger(GeminiProvider.name)

  constructor(private readonly config: ConfigService) {}

  private thinkingHeadroom(): number {
    const raw = this.config.get<string>('AI_SUMMARY_THINKING_HEADROOM')
    if (raw === undefined || raw === '') return DEFAULT_THINKING_HEADROOM
    const value = Number(raw)
    return Number.isInteger(value) && value >= 0 ? value : DEFAULT_THINKING_HEADROOM
  }

  async chat(messages: LlmMessage[], options: LlmChatOptions): Promise<string | null> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const genAI = new GoogleGenerativeAI(this.config.getOrThrow('AI_SUMMARY_API_KEY'))
    const model = this.config.get('AI_SUMMARY_MODEL') || 'gemini-2.5-flash'
    // Optional. Set it to send requests through a Gemini-compatible proxy instead of Google's own
    // endpoint; the SDK still appends `/v1beta/models/...`, so the proxy must speak the same API.
    const baseUrl = this.config.get<string>('AI_SUMMARY_BASE_URL') || undefined
    const maxOutputTokens =
      options.maxTokens === undefined ? undefined : options.maxTokens + this.thinkingHeadroom()

    const systemInstruction = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n')
    const turns = messages.filter((m) => m.role !== 'system')

    const genModel = genAI.getGenerativeModel(
      {
        model,
        systemInstruction: systemInstruction || undefined,
        // A cap matters for a proxy with a spending limit, which reserves each request's worst
        // case up front. The headroom above keeps that cap from cutting answers short.
        generationConfig: { temperature: options.temperature, maxOutputTokens },
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

    // A reply that hit the cap reads like a finished one that simply stopped, so say so where it
    // can be seen. The counts show whether thinking or the answer used the budget.
    const finishReason = result.response.candidates?.[0]?.finishReason
    if (finishReason === 'MAX_TOKENS') {
      const usage = result.response.usageMetadata as
        { candidatesTokenCount?: number; thoughtsTokenCount?: number } | undefined
      this.logger.warn(
        `Gemini reply cut off at the output cap (${maxOutputTokens}): ` +
          `answer ${usage?.candidatesTokenCount ?? '?'} tokens, thinking ${usage?.thoughtsTokenCount ?? '?'} tokens`,
      )
    }

    return result.response.text().trim() || null
  }
}
