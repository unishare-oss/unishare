'use client'

import { useRef, useState, type KeyboardEvent } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface AiComposerProps {
  /** Receives the trimmed text. The composer clears itself first, then refocuses once this settles. */
  onSend: (text: string) => void | Promise<void>
  /** True while an answer is on its way: sending is blocked so a second question cannot race it. */
  disabled?: boolean
  placeholder?: string
  maxLength?: number
}

/**
 * The box a student types a question into. Enter sends and Shift+Enter starts a new line.
 *
 * Owns the draft text and nothing else, so the same composer serves a post's panel, a chat room
 * and a site-wide assistant: each passes what to do with the question.
 */
export function AiComposer({
  onSend,
  disabled = false,
  placeholder = 'Ask a question…',
  maxLength = 500,
}: AiComposerProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  async function send() {
    const text = input.trim()
    if (!text || disabled) return
    setInput('')
    await onSend(text)
    textareaRef.current?.focus()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="flex gap-2 items-end">
      <Textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="resize-none min-h-[2.5rem] max-h-32 text-sm"
        rows={1}
        disabled={disabled}
        maxLength={maxLength}
      />
      <Button
        size="icon"
        variant="ghost"
        onClick={send}
        disabled={!input.trim() || disabled}
        className="shrink-0"
        aria-label="Send"
      >
        <Send className="size-4" />
      </Button>
    </div>
  )
}
