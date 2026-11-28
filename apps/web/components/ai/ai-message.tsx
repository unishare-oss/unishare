'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AiReply } from '@/components/ai/ai-reply'
import { CopyReplyButton } from '@/components/ai/copy-reply-button'
import { useSmoothText } from '@/components/ai/use-smooth-text'

/** What every AI conversation shares: who spoke, what they said, and whether it was a refusal. */
export interface AiMessageData {
  role: 'user' | 'assistant'
  content: string
  /** The assistant declined because the question was outside what it may answer. */
  offTopic?: boolean
}

interface AiMessageProps {
  message: AiMessageData
  /**
   * Whatever belongs under the answer and is specific to where the conversation happens, such as
   * the sources a document chat consulted. Rendered inside the bubble, after the text.
   */
  footer?: ReactNode
  /**
   * Whether to offer copying. The host decides because only it knows if this reply is still
   * arriving, and a copy of half an answer is a trap.
   */
  showCopy?: boolean
  /** The reply is still arriving, so a caret trails the last word. */
  streaming?: boolean
  /**
   * Asks the question again. Pass it only for the latest reply, and only once it has finished:
   * the host knows both, this component does not.
   */
  onRegenerate?: () => void
  /**
   * Runs each time more of a streaming reply is revealed, so the host can keep the newest words in
   * view. The text grows between chunks too, so watching the message list alone would miss it.
   */
  onReveal?: () => void
}

/**
 * One message in an AI conversation, as a bubble.
 *
 * Shared by every place the app talks to an AI, so a reply looks and behaves the same in a post's
 * panel, in a chat room and in a site-wide assistant. The assistant's text is rendered as
 * restricted markdown; the student's own text is echoed back verbatim, because rendering THEIR
 * text as markup would let a question containing `#` or `- ` come back looking like a heading or
 * a list they never wrote.
 */
export function AiMessage({
  message,
  footer,
  showCopy = true,
  streaming = false,
  onRegenerate,
  onReveal,
}: AiMessageProps) {
  const isUser = message.role === 'user'
  // Providers send replies in uneven chunks, and Gemini in large ones, so the reply is revealed
  // a little each frame rather than a chunk at a time. The student's own text is never animated.
  const { shown, revealing } = useSmoothText(message.content, streaming && !isUser)
  const typing = streaming || revealing
  // Copy and retry wait until the whole reply is on screen, not just until it has arrived.
  const canCopy = !isUser && !message.offTopic && Boolean(message.content) && showCopy && !revealing
  const canRegenerate = Boolean(onRegenerate) && !revealing

  const onRevealRef = useRef(onReveal)
  useEffect(() => {
    onRevealRef.current = onReveal
  }, [onReveal])
  useEffect(() => {
    if (typing) onRevealRef.current?.()
  }, [shown, typing])

  return (
    <div className={cn('flex gap-2 text-sm', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'rounded-lg px-3 py-2 max-w-[85%] leading-relaxed',
          isUser
            ? 'bg-primary text-primary-foreground'
            : message.offTopic
              ? 'bg-muted border border-border text-text-muted'
              : 'bg-muted border border-border',
        )}
      >
        <div className="flex flex-col gap-1.5">
          <div className="flex items-start gap-1.5">
            {message.offTopic && (
              <AlertCircle className="size-3.5 shrink-0 mt-0.5 text-brand-edge" />
            )}
            {isUser ? (
              <span>{message.content}</span>
            ) : (
              <AiReply streaming={typing}>{shown}</AiReply>
            )}
          </div>
          {footer}
        </div>
      </div>
      {/* Beside the bubble, not in it, so the order of answer then footer inside it is untouched. */}
      {!isUser && (canCopy || canRegenerate) && (
        <div className="flex flex-col items-start justify-end gap-0.5">
          {canCopy && <CopyReplyButton text={message.content} />}
          {canRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              aria-label="Regenerate reply"
              className="inline-flex items-center gap-1 rounded px-1 py-0.5 font-mono text-[10px] uppercase tracking-wide text-text-muted transition-colors hover:text-foreground"
            >
              <RefreshCw className="size-3" strokeWidth={1.5} aria-hidden="true" />
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/** After this long, the label says so: a thinking model can take many seconds before its first word. */
export const STILL_THINKING_AFTER_MS = 8000

/**
 * Shown from the moment a question is sent until the first word of the answer arrives.
 *
 * Three dots bounce in turn, and the label changes to "Still thinking…" if the wait runs long, so
 * a slow answer reads as work in progress rather than a stuck screen. The dots hold still for
 * anyone who asked for less motion, and screen readers hear the label, not the dots.
 */
export function AiThinking() {
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), STILL_THINKING_AFTER_MS)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="flex justify-start">
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-2 bg-muted border border-border rounded-lg px-3 py-2 text-sm text-text-muted"
      >
        <span className="flex items-center gap-1" aria-hidden="true">
          {['[animation-delay:-0.3s]', '[animation-delay:-0.15s]', ''].map((delay) => (
            <span
              key={delay || 'last'}
              className={cn(
                'size-1.5 rounded-full bg-primary animate-bounce motion-reduce:animate-none',
                delay,
              )}
            />
          ))}
        </span>
        <span>{slow ? 'Still thinking…' : 'Thinking…'}</span>
      </div>
    </div>
  )
}
