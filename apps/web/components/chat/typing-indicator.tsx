'use client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { ChatRoomParticipantEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

interface TypingIndicatorProps {
  participant?: ChatRoomParticipantEntity
}

export function TypingIndicator({ participant }: TypingIndicatorProps) {
  return (
    <div className="flex w-full items-end gap-2 justify-start">
      <div className="w-8 flex-shrink-0">
        <Avatar className="w-8 h-8 rounded-sm">
          <AvatarImage src={participant?.user?.image || ''} />
          <AvatarFallback className="bg-border text-foreground font-mono font-medium text-xs rounded-none">
            {participant?.user?.name?.[0]?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
      </div>
      <div
        className="max-w-[70%] rounded-2xl rounded-bl-none px-4 py-2 shadow-sm flex items-center gap-1 text-sm min-h-[2.25rem]"
        style={{
          backgroundColor: 'var(--color-muted)',
          color: 'var(--color-foreground)',
        }}
      >
        <span
          className="w-2 h-2 rounded-full animate-bounce [animation-delay:-0.3s]"
          style={{ backgroundColor: 'var(--color-muted-foreground)' }}
        />
        <span
          className="w-2 h-2 rounded-full animate-bounce [animation-delay:-0.15s]"
          style={{ backgroundColor: 'var(--color-muted-foreground)' }}
        />
        <span
          className="w-2 h-2 rounded-full animate-bounce"
          style={{ backgroundColor: 'var(--color-muted-foreground)' }}
        />
      </div>
    </div>
  )
}
