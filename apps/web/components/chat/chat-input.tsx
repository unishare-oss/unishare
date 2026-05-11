'use client'

import { useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Send, Loader2, Paperclip, ImageIcon } from 'lucide-react'
import type { ChatMessageEntity } from '@/src/lib/api/generated/unishareAPI.schemas'
import { ChatInputContextBar } from './chat-input-context-bar'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onImageSelect?: (file: File) => void
  onFileSelect?: (file: File) => void
  disabled?: boolean
  placeholder?: string
  editingMessage?: ChatMessageEntity | null
  replyingToMessage?: ChatMessageEntity | null
  currentUserId?: string
  onCancelEdit?: () => void
  onCancelReply?: () => void
}

export function ChatInput({
  value,
  onChange,
  onSend,
  onImageSelect,
  onFileSelect,
  disabled,
  placeholder = 'Type a message...',
  editingMessage,
  replyingToMessage,
  currentUserId,
  onCancelEdit,
  onCancelReply,
}: ChatInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const attachInputRef = useRef<HTMLInputElement>(null)

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
    if (editingMessage) return editingMessage.imageUrl ? 'Edit caption…' : 'Edit your message…'
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
        <ChatInputContextBar
          mode="reply"
          message={replyingToMessage}
          onCancel={onCancelReply}
          currentUserId={currentUserId}
        />
      )}

      {/* Original Input Area */}
      <div className="p-3.5 border-t">
        <div className="flex items-end gap-2 max-w-4xl mx-auto">
          {/* Hidden image input */}
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onImageSelect?.(file)
              e.target.value = ''
            }}
          />
          {/* Hidden file input */}
          <Input
            ref={attachInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onFileSelect?.(file)
              e.target.value = ''
            }}
          />
          {onImageSelect && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
              title="Send image"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
            title="Attach file"
            onClick={() => attachInputRef.current?.click()}
            disabled={disabled}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Textarea
            ref={inputRef}
            placeholder={getPlaceholder()}
            value={value}
            rows={1}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !disabled) {
                e.preventDefault()
                onSend()
              }
              if (e.key === 'Escape') {
                if (editingMessage) onCancelEdit?.()
                else if (replyingToMessage) onCancelReply?.()
              }
            }}
            className="flex-1 min-h-10 max-h-32 resize-none py-2"
          />
          <Button size="icon" onClick={onSend} disabled={disabled} className="h-10 w-10 shrink-0">
            {disabled ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
