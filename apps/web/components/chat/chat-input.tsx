'use client'

import { useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Send, Loader2, X, Pencil } from 'lucide-react'
import type { ChatMessageEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  disabled?: boolean
  placeholder?: string
  editingMessage?: ChatMessageEntity | null
  onCancelEdit?: () => void
}

export function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
  placeholder = 'Type a message...',
  editingMessage,
  onCancelEdit,
}: ChatInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when editing mode is activated
  useEffect(() => {
    if (editingMessage) {
      // Delay focus to ensure animations and re-renders complete
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [editingMessage])

  return (
    <div className="bg-background sticky bottom-0 z-20">
      {/* Editing Box Layer */}
      {editingMessage && (
        <div className="bg-muted/10 w-full border-t animate-in slide-in-from-bottom-1 duration-200">
          <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden mr-4">
              <Pencil className="h-3 w-3 text-primary shrink-0" />
              <div className="flex items-center gap-2 truncate">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider shrink-0">
                  Editing Message
                </span>
                <span className="text-xs text-muted-foreground truncate italic opacity-70">
                  "{editingMessage.content}"
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full hover:bg-muted shrink-0"
              onClick={onCancelEdit}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Original Input Area */}
      <div className="p-3.5 border-t">
        <div className="flex items-center gap-2 max-w-4xl mx-auto">
          <Input
            ref={inputRef}
            placeholder={editingMessage ? 'Edit your message...' : placeholder}
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
