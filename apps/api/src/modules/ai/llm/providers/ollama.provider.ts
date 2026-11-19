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

  /**
   * Ollama streams NDJSON: one JSON object per line, each with a `message.content` fragment and a
   * final `{ done: true }`.
   *
   * Decoded with `{ stream: true }` and buffered to the last newline, because neither boundary is
   * guaranteed to line up with a network chunk — a multi-byte character or a whole JSON object
   * can be split across two reads, and parsing per-read would corrupt the first and throw on the
   * second. Deltas are yielded raw for the reason documented on GroqProvider.chatStream.
   */
  async *chatStream(messages: LlmMessage[], options: LlmChatOptions): AsyncIterable<string> {
    const endpoint = this.config.get('AI_SUMMARY_ENDPOINT') ?? 'http://localhost:11434'
    const model = this.config.get('AI_SUMMARY_MODEL') || 'llama3.2'

    const response = await fetch(`${endpoint}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: true,
        messages,
        options: { num_predict: options.maxTokens, temperature: options.temperature },
      }),
    })

    // Thrown with `status` attached so LlmService can recognise a 429 or a 5xx as transient. The
    // non-streaming path's bare `Error` cannot be classified, and a rate-limited stream would
    // otherwise surface as a 500.
    if (!response.ok || !response.body) {
      throw Object.assign(new Error(`Ollama responded with ${response.status}`), {
        status: response.status,
      })
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffered = ''

    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break

        buffered += decoder.decode(value, { stream: true })
        const lines = buffered.split('\n')
        // The last element is whatever came after the final newline — an incomplete line, or an
        // empty string when the chunk ended cleanly. Either way it waits for the next read.
        buffered = lines.pop() ?? ''

        for (const line of lines) {
          const delta = parseOllamaLine(line)
          if (delta) yield delta
        }
      }

      const delta = parseOllamaLine(buffered)
      if (delta) yield delta
    } finally {
      // Runs on a `break` out of the consumer's loop too — an off-topic refusal stops reading
      // immediately, and without this the connection would be left open.
      await reader.cancel().catch(() => undefined)
    }
  }
}

/** One NDJSON line to its content fragment. Blank lines and the trailing `done` frame yield null. */
function parseOllamaLine(line: string): string | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  try {
    const parsed = JSON.parse(trimmed) as { message?: { content?: string } }
    return parsed.message?.content || null
  } catch {
    // A malformed line is not worth failing an otherwise good answer over.
    return null
  }
}
