'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Send, Loader2 } from 'lucide-react'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
  placeholder = 'Type a message...',
}: ChatInputProps) {
  return (
    <div className="p-3.5 border-t bg-background sticky bottom-0">
      <div className="flex items-center gap-2 max-w-4xl mx-auto">
        <Input
          placeholder={placeholder}
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
  )
}
