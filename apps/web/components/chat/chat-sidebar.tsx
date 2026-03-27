'use client'

import { useChatControllerGetRooms } from '@/src/lib/api/generated/chat/chat'
import {
  useFollowsControllerGetFollowing,
  useFollowsControllerGetFollowers,
} from '@/src/lib/api/generated/follows/follows'
import { useAuth } from '@/contexts/auth-context'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { useRouter, usePathname } from 'next/navigation'
import { Users, MessageSquare } from 'lucide-react'
import { useMemo } from 'react'

interface ChatSidebarProps {
  selectedRoomId?: string
}

export function ChatSidebar({ selectedRoomId }: ChatSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { session } = useAuth()
  const currentUserId = session?.user?.id

  const { data: roomsResponse, isLoading: roomsLoading } = useChatControllerGetRooms()

  const { data: followingResponse, isLoading: followingLoading } = useFollowsControllerGetFollowing(
    currentUserId || '',
    {
      query: { enabled: !!currentUserId },
    },
  )

  const { data: followersResponse, isLoading: followersLoading } = useFollowsControllerGetFollowers(
    currentUserId || '',
    {
      query: { enabled: !!currentUserId },
    },
  )

  const rooms = roomsResponse?.data || []

  // Merge Following and Followers into a unique list of "Network" users
  const networkUsers = useMemo(() => {
    const following = followingResponse?.data || []
    const followers = followersResponse?.data || []

    // Use a Map to deduplicate by ID
    const userMap = new Map<string, any>()

    following.forEach((user) => userMap.set(user.id, { ...user, relationship: 'following' }))
    followers.forEach((user) => {
      if (!userMap.has(user.id)) {
        userMap.set(user.id, { ...user, relationship: 'follower' })
      } else {
        userMap.set(user.id, { ...userMap.get(user.id), relationship: 'mutual' })
      }
    })

    const allUsers = Array.from(userMap.values())

    // Filter out users who already have a DM room
    return allUsers.filter(
      (user) =>
        !rooms.some(
          (room) => room.type === 'DM' && room.participants.some((p) => p.userId === user.id),
        ),
    )
  }, [followingResponse, followersResponse, rooms])

  if (roomsLoading || followingLoading || followersLoading) {
    return (
      <div className="flex flex-col gap-2 p-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <Card className="flex flex-col h-full border-none gap-0 rounded-none backdrop-blur bg-background/95 py-2 shadow-none">
      <ScrollArea className="flex-1">
        <div className="flex flex-col pb-20">
          {/* Active Conversations */}
          {rooms.length > 0 && (
            <div className="px-4 py-2 mt-2">
              <h3 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <MessageSquare className="h-3 w-3" /> Recent Chats
              </h3>
            </div>
          )}

          {rooms.map((room) => {
            const lastMessage = room.messages?.[0]
            const isSelected = selectedRoomId === room.id
            const otherParticipant =
              room.type === 'DM' ? room.participants?.find((p) => p.userId !== currentUserId) : null
            const displayName = otherParticipant?.user?.name ?? room.name ?? 'Chat Room'
            const displayImage = otherParticipant?.user?.image ?? room.imageUrl ?? ''

            return (
              <button
                key={room.id}
                onClick={() => router.push(`/chat/${room.id}`)}
                className={cn(
                  'relative flex items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-accent/50',
                  isSelected &&
                    'bg-accent/50 before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:bg-primary',
                )}
              >
                <Avatar className="h-10 w-10 rounded-[6px]">
                  <AvatarImage src={displayImage} alt={displayName} />
                  <AvatarFallback className="text-xs bg-border text-foreground rounded-none font-mono font-medium">
                    {displayName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate text-sm">{displayName}</span>
                    {lastMessage && (
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                        {formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: false })}
                      </span>
                    )}
                  </div>
                  {lastMessage && (
                    <p className="text-xs text-muted-foreground truncate opacity-70 mt-0.5">
                      {lastMessage.content}
                    </p>
                  )}
                </div>
              </button>
            )
          })}

          {/* New Conversations (Network) */}
          {networkUsers.length > 0 && (
            <>
              {rooms.length > 0 && <Separator className="my-2" />}
              <div className="px-4 py-2 mt-2">
                <h3 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Users className="h-3 w-3" /> Network
                </h3>
              </div>
              {networkUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => router.push(`/chat/new/${user.id}`)}
                  className={cn(
                    'relative flex items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-accent/50 group',
                    pathname === `/chat/new/${user.id}` &&
                      'bg-accent/50 before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:bg-primary',
                  )}
                >
                  <Avatar className="h-10 w-10 rounded-[6px]">
                    <AvatarImage src={user.image || ''} alt={user.name} />
                    <AvatarFallback className="text-xs rounded-none bg-border text-foreground font-mono font-medium">
                      {user.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                    <span className="font-medium truncate text-sm block">{user.name}</span>
                    <span className="text-xs text-muted-foreground mt-0.5 block">
                      {user.relationship === 'mutual'
                        ? 'Mutual connection • Say hello!'
                        : 'Start a conversation'}
                    </span>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                </button>
              ))}
            </>
          )}

          {rooms.length === 0 && networkUsers.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No conversations yet
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  )
}
