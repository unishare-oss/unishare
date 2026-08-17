'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { AiChatCitationDto } from '@/src/lib/api/generated/unishareAPI.schemas'
import { ApiError } from '@/src/lib/api/fetcher'
import { streamPostAiChat } from '@/src/lib/api/ai-chat-stream'

/**
 * A chunk that retrieval returned and put in the model's context — a source that was consulted,
 * not proof that a given sentence came from it. The server cannot know which excerpts the model
 * leaned on, so nothing here may be presented as sentence-level attribution.
 */
export interface AiChatCitation {
  chunkId: string
  /** Null for formats with no pagination (.docx via mammoth). */
  pageNum: number | null
  /**
   * Which document the page belongs to. `pageNum` restarts at 1 per file, so a page number
   * without this is ambiguous on a multi-file post — and `fileId`, not `fileName`, is the
   * identity: uploading "notes.pdf" twice is ordinary.
   */
  fileId: string
  fileName: string
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
 *
 * A streamed turn can fail on either side of the first token, and both arrive here: an early
 * failure as the response status, a late one as the `error` event's status. The copy is the same
 * because the situation is the same.
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
    // Narrowed like pageNum: the contract says these are strings, the wire may disagree, and a
    // citation grouped under `undefined` would silently merge two documents into one chip.
    fileId: typeof c.fileId === 'string' ? c.fileId : '',
    fileName: typeof c.fileName === 'string' ? c.fileName : '',
    snippet: c.snippet,
  }))
}

export function usePostAiChat(postId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const messagesRef = useRef<ChatMessage[]>([])
  const [isPending, setIsPending] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const updateMessages = useCallback((updater: (prev: ChatMessage[]) => ChatMessage[]) => {
    setMessages((prev) => {
      const next = updater(prev)
      messagesRef.current = next
      return next
    })
  }, [])

  // A turn in flight when the panel unmounts would otherwise keep generating tokens nobody will
  // read, and keep the connection open behind a closed page.
  useEffect(() => () => abortRef.current?.abort(), [])

  const sendMessage = useCallback(
    async (userText: string) => {
      const userMessage: ChatMessage = { role: 'user', content: userText }
      const updated = [...messagesRef.current, userMessage]
      messagesRef.current = updated
      setMessages(updated)

      const controller = new AbortController()
      abortRef.current = controller
      setIsPending(true)

      // The assistant's turn is built up here and repainted on every delta. It is NOT appended
      // until there is something to show: an empty bubble sitting next to the "Thinking…"
      // indicator reads as a broken reply rather than a pending one.
      let content = ''
      let citations: AiChatCitation[] = []
      let offTopic = false
      let appended = false
      const index = updated.length

      const paint = () => {
        // The bare sentinel is a protocol token, never an answer — so it is not rendered even
        // for the instant between arriving and being resolved at `done`. The server's gate is
        // what makes this unreachable; this is the second lock on the same door, and it is the
        // one that survives a server regression.
        const visible = content.trim() === OFF_TOPIC_SENTINEL ? '' : content
        const message: ChatMessage = {
          role: 'assistant',
          content: offTopic ? OFF_TOPIC_MESSAGE : visible,
          offTopic,
          // Always derived from this turn's events: a refusal carries no sources, and stale
          // citations from an earlier answer must never trail along.
          citations: offTopic ? [] : citations,
        }
        updateMessages((prev) => {
          const next = [...prev]
          if (appended) next[index] = message
          else next.push(message)
          return next
        })
        appended = true
      }

      try {
        for await (const event of streamPostAiChat(
          postId,
          updated.map((m) => ({ role: m.role, content: m.content })),
          controller.signal,
        )) {
          if (event.type === 'citations') {
            // Recorded, not painted: the first delta is a beat away and painting here would flash
            // an empty bubble carrying a sources footer and no answer.
            citations = normaliseCitations(event.citations)
            continue
          }

          if (event.type === 'delta') {
            content += event.text
            paint()
            continue
          }

          if (event.type === 'done') {
            // The flag is the contract, but the literal sentinel is checked too: a server that
            // streamed `OFF_TOPIC` and then said `offTopic: false` would otherwise leave the
            // token on screen as the answer.
            offTopic = event.offTopic || content.trim() === OFF_TOPIC_SENTINEL
            paint()
          }
        }
      } catch (error) {
        // Nothing to render once the component is gone, and an aborted turn is not a failure.
        if (controller.signal.aborted) return

        // Logged as well as rendered: a malformed event throws in the loop above and is otherwise
        // indistinguishable from a server error, which is exactly how a silent regression on the
        // citations boundary would reach users unnoticed.
        console.error('[use-post-ai-chat] send failed', error)
        // The partial answer is REPLACED rather than annotated. Half an answer with an apology
        // under it reads as a complete answer to anyone who does not scroll, and the half that
        // arrived was never checked against the rest of the reply.
        content = errorMessageFor(error)
        citations = []
        offTopic = false
        paint()
      } finally {
        // Cleared before the flag drops, so a second send cannot race the first one's abort.
        if (abortRef.current === controller) abortRef.current = null
        setIsPending(false)
      }
    },
    [postId, updateMessages],
  )

  const reset = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    messagesRef.current = []
    setMessages([])
  }, [])

  return { messages, sendMessage, isPending, reset }
}
