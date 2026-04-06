'use client'

import { useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Send, Loader2 } from 'lucide-react'
import type { ChatMessageEntity } from '@/src/lib/api/generated/unishareAPI.schemas'
import { ChatInputContextBar } from './chat-input-context-bar'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  disabled?: boolean
  placeholder?: string
  editingMessage?: ChatMessageEntity | null
  replyingToMessage?: ChatMessageEntity | null
  onCancelEdit?: () => void
  onCancelReply?: () => void
}

export function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
  placeholder = 'Type a message...',
  editingMessage,
  replyingToMessage,
  onCancelEdit,
  onCancelReply,
}: ChatInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when editing or replying mode is activated
  useEffect(() => {
    if (editingMessage || replyingToMessage) {
      // Delay focus to ensure animations and re-renders complete
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [editingMessage, replyingToMessage])

  // Determine input placeholder based on context
  const getPlaceholder = () => {
    if (editingMessage) return 'Edit your message...'
    if (replyingToMessage) return 'Reply to message...'
    return placeholder
  }

  return (
    <div className="bg-background sticky bottom-0 z-20">
      {/* Context Bar for Edit or Reply */}
      {editingMessage && onCancelEdit && (
        <ChatInputContextBar mode="edit" message={editingMessage} onCancel={onCancelEdit} />
      )}
      {replyingToMessage && onCancelReply && (
        <ChatInputContextBar mode="reply" message={replyingToMessage} onCancel={onCancelReply} />
      )}

      {/* Original Input Area */}
      <div className="p-3.5 border-t">
        <div className="flex items-center gap-2 max-w-4xl mx-auto">
          <Input
            ref={inputRef}
            placeholder={getPlaceholder()}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && !disabled && onSend()}
            className="flex-1"
          />
          <Button size="icon" onClick={onSend} disabled={disabled} className="h-10 w-10 shrink-0">
            {disabled ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
