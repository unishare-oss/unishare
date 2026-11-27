'use client'

import type { ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AiReply } from '@/components/ai/ai-reply'
import { CopyReplyButton } from '@/components/ai/copy-reply-button'

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
export function AiMessage({ message, footer, showCopy = true }: AiMessageProps) {
  const isUser = message.role === 'user'

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
            {isUser ? <span>{message.content}</span> : <AiReply>{message.content}</AiReply>}
          </div>
          {footer}
        </div>
      </div>
      {/* Beside the bubble, not in it, so the order of answer then footer inside it is untouched. */}
      {!isUser && !message.offTopic && message.content && showCopy && (
        <div className="flex items-end">
          <CopyReplyButton text={message.content} />
        </div>
      )}
    </div>
  )
}

/** Shown from the moment a question is sent until the first word of the answer arrives. */
export function AiThinking() {
  return (
    <div className="flex justify-start">
      <div className="bg-muted border border-border rounded-lg px-3 py-2 text-sm text-text-muted">
        <span className="animate-pulse">Thinking…</span>
      </div>
    </div>
  )
}
