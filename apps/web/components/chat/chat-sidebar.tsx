'use client'

import { useChatControllerGetRooms } from '@/src/lib/api/generated/chat/chat'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'
import { useRouter } from 'next/navigation'

interface ChatSidebarProps {
  selectedRoomId?: string
}

export function ChatSidebar({ selectedRoomId }: ChatSidebarProps) {
  const router = useRouter()
  const { data: roomsResponse, isLoading } = useChatControllerGetRooms()
  const rooms = roomsResponse?.data || []

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 p-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <Card className="h-full border-none shadow-none rounded-none bg-card/50 backdrop-blur">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold tracking-tight">Messages</h2>
      </div>
      <ScrollArea className="h-[calc(100vh-8rem)]">
        <div className="flex flex-col">
          {rooms.map((room) => {
            const lastMessage = room.messages?.[0]
            const isSelected = selectedRoomId === room.id

            return (
              <button
                key={room.id}
                onClick={() => router.push(`/chat/${room.id}`)}
                className={cn(
                  'flex items-start gap-3 p-4 text-left transition-colors hover:bg-accent/50',
                  isSelected && 'bg-accent',
                )}
              >
                <Avatar className="h-10 w-10 border shadow-sm">
                  <AvatarImage src={room.imageUrl || ''} alt={room.name || 'Room'} />
                  <AvatarFallback className="text-xs bg-muted">
                    {(room.name || 'CH').substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate text-[13px]">
                      {room.name || 'Chat Room'}
                    </span>
                    {lastMessage && (
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                        {formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: false })}
                      </span>
                    )}
                  </div>
                  {lastMessage && (
                    <p className="text-xs text-muted-foreground truncate opacity-70">
                      {lastMessage.content}
                    </p>
                  )}
                </div>
              </button>
            )
          })}
          {rooms.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No conversations yet
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  )
}
