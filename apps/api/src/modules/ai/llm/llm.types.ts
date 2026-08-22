export interface LlmMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LlmChatOptions {
  maxTokens?: number
  temperature?: number
}

export interface LlmProvider {
  chat(messages: LlmMessage[], options: LlmChatOptions): Promise<string | null>

  /**
   * Token-by-token generation, for the providers whose SDK supports it.
   *
   * Optional on purpose: `LlmService.chatStream` falls back to `chat` and yields the whole reply
   * as a single delta for providers that do not implement it, so a caller cannot tell which
   * providers stream from the shape of what it receives — only from how it arrives.
   */
  chatStream?(messages: LlmMessage[], options: LlmChatOptions): AsyncIterable<string>
}
