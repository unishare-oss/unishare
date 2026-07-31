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
}
