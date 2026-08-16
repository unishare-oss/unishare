'use client'

import { useState, useCallback, useRef } from 'react'
import { usePostsControllerAiChat } from '@/src/lib/api/generated/posts/posts'
import type { AiChatCitationDto } from '@/src/lib/api/generated/unishareAPI.schemas'
import { ApiError } from '@/src/lib/api/fetcher'

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
 * Every failure used to render as ERROR_MESSAGE, so a student could not tell "this feature is
 * switched off" from "the server broke", and a response-shape mismatch reached them silently.
 *
 * 503 is a real, expected state, not a fault: `chatWithPost` returns it when no AI provider is
 * configured. 403 is the draft-post case — `getAiIndexStatus` filters only on `deletedAt` while
 * chat also requires PUBLISHED and APPROVED, so an author reading their own draft is invited to
 * ask and then refused.
 */
function errorMessageFor(error: unknown): string {
  const status = error instanceof ApiError ? error.status : undefined
  if (status === 503) return 'AI chat is unavailable right now. Please try again later.'
  if (status === 403) return 'AI chat is available once this post is published and approved.'
  return ERROR_MESSAGE
}

/** What the server canonicalises an off-topic reply to. It must never reach the screen. */
const OFF_TOPIC_SENTINEL = 'OFF_TOPIC'

/**
 * `pageNum` is typed `number | null`, but that is a claim about the contract, not about the bytes
 * on the wire — an absent field or a stringified number would both satisfy the compiler and
 * neither is a page. So this narrows at runtime: anything non-numeric becomes null, and the UI can
 * only ever render a page label it was actually given.
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
        // The flag is the contract, but the literal sentinel is checked too: a server that sent
        // `{ reply: 'OFF_TOPIC', offTopic: false }` would otherwise print the sentinel verbatim.
        const offTopic = data.offTopic || data.reply === OFF_TOPIC_SENTINEL

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
      } catch (error) {
        // Logged as well as rendered: a response-shape mismatch throws in the `try` above and is
        // otherwise indistinguishable from a server error, which is exactly how a silent
        // regression on the citations boundary would reach users unnoticed.
        console.error('[use-post-ai-chat] send failed', error)
        updateMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: errorMessageFor(error),
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
