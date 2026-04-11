'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { ChatRoomEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

interface ChatConversationStartProps {
  room: ChatRoomEntity
  currentUserId?: string
  messageCount: number
}

export function ChatConversationStart({
  room,
  currentUserId,
  messageCount,
}: ChatConversationStartProps) {
  if (room.type === 'GROUP') {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Avatar className="h-20 w-20 mb-4 rounded-[6px]">
          <AvatarImage src={room.imageUrl || ''} />
          <AvatarFallback className="text-xl rounded-none bg-border text-foreground font-mono font-medium">
            {room.name?.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <h2 className="text-xl font-bold">{room.name ?? 'Group Chat'}</h2>
        <p className="text-sm text-muted-foreground max-w-xs mt-2">
          {room.participants?.length ?? 0} members in this group.
          {messageCount === 0 ? ' Be the first to say something!' : ''}
        </p>
      </div>
    )
  }

  const otherParticipant = room.participants?.find((p) => p.userId !== currentUserId)
  if (!otherParticipant?.user) return null

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <Avatar className="h-20 w-20 mb-4 rounded-[6px]">
        <AvatarImage src={otherParticipant.user.image || ''} />
        <AvatarFallback className="text-xl rounded-none bg-border text-foreground font-mono font-medium">
          {otherParticipant.user.name?.[0]?.toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <h2 className="text-xl font-bold">{otherParticipant.user.name}</h2>
      <p className="text-sm text-muted-foreground max-w-xs mt-2">
        This is the beginning of your conversation with {otherParticipant.user.name}.
        {messageCount === 0 ? ' Send a message to start chatting.' : ''}
      </p>
    </div>
  )
}
