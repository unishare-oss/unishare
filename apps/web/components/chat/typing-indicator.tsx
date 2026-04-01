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
      <div className="max-w-[70%] rounded-2xl rounded-bl-none px-4 py-2 bg-gray-100 text-gray-900 shadow-sm flex items-center gap-1 text-sm min-h-[2.25rem]">
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
      </div>
    </div>
  )
}
