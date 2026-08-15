'use client'

import { useState, useCallback, useRef } from 'react'
import { usePostsControllerAiChat } from '@/src/lib/api/generated/posts/posts'
import type { AiChatCitationDto } from '@/src/lib/api/generated/unishareAPI.schemas'

/**
 * A chunk that retrieval returned and put in the model's context — a source that was consulted,
 * not proof that a given sentence came from it. The server cannot know which excerpts the model
 * leaned on, so nothing here may be presented as sentence-level attribution.
 */
export interface AiChatCitation {
  chunkId: string
  /** Null for formats with no pagination (.docx via mammoth). */
  pageNum: number | null
  /** Capped at 160 chars server-side and often mid-sentence — not a quotation of record. */
  snippet: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  offTopic?: boolean
  citations?: AiChatCitation[]
}

const OFF_TOPIC_MESSAGE =
  'I can only answer questions about this document. Please ask something related to its content.'

const ERROR_MESSAGE = 'Something went wrong. Please try again.'

/**
 * The generated `AiChatCitationDto.pageNum` is `{ [key: string]: unknown } | null`, because the
 * API DTO's `@ApiProperty({ nullable: true })` carries no `type: Number` and Swagger emits an
 * untyped nullable. Rather than widen the response cast, narrow here: anything that is not a
 * number becomes null, so the UI can only ever render a page label it actually received.
 */
function normaliseCitations(raw: AiChatCitationDto[] | undefined): AiChatCitation[] {
  if (!Array.isArray(raw)) return []
  return raw.map((c) => ({
    chunkId: c.chunkId,
    pageNum: typeof c.pageNum === 'number' ? c.pageNum : null,
    snippet: c.snippet,
  }))
}

export function usePostAiChat(postId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const messagesRef = useRef<ChatMessage[]>([])
  const { mutateAsync, isPending } = usePostsControllerAiChat()

  const updateMessages = useCallback((updater: (prev: ChatMessage[]) => ChatMessage[]) => {
    setMessages((prev) => {
      const next = updater(prev)
      messagesRef.current = next
      return next
    })
  }, [])

  const sendMessage = useCallback(
    async (userText: string) => {
      const userMessage: ChatMessage = { role: 'user', content: userText }
      const updated = [...messagesRef.current, userMessage]
      messagesRef.current = updated
      setMessages(updated)

      try {
        const result = await mutateAsync({
          id: postId,
          data: {
            messages: updated.map((m) => ({ role: m.role, content: m.content })),
          },
        })

        // `customFetch` already unwraps the `{ success, message, data }` envelope once, so the
        // payload sits at `result.data`. Reaching one level further is the bug that shipped in
        // `use-ai-index-status.ts`.
        const data = result.data
        const offTopic = data.offTopic

        updateMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: offTopic ? OFF_TOPIC_MESSAGE : data.reply,
            offTopic,
            // Always derived from this turn's response: a refusal carries no sources, and stale
            // citations from an earlier answer must never trail along.
            citations: offTopic ? [] : normaliseCitations(data.citations),
          },
        ])
      } catch {
        updateMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: ERROR_MESSAGE,
            offTopic: false,
            citations: [],
          },
        ])
      }
    },
    [mutateAsync, postId, updateMessages],
  )

  const reset = useCallback(() => {
    messagesRef.current = []
    setMessages([])
  }, [])

  return { messages, sendMessage, isPending, reset }
}
