'use client'

import { useChatControllerGetRooms } from '@/src/lib/api/generated/chat/chat'
import { useAuth } from '@/contexts/auth-context'
import { useCreateDM } from '@/hooks/use-chat-mutations'
import { useNetworkUsers } from '@/hooks/use-network-users'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { useRouter } from 'next/navigation'
import { Users, MessageSquare, Loader2, ImageIcon, FileIcon } from 'lucide-react'
import { useMemo, useState, useEffect } from 'react'
import { useCrypto } from '@/hooks/use-crypto'
import { useGlobalTypingIndicator } from '@/hooks/use-typing-indicator'

import { useChatSocket } from '@/hooks/use-chat-socket'
import { SidebarTypingIndicator } from './sidebar-typing-indicator'

interface ChatSidebarProps {
  selectedRoomId?: string
}

export function ChatSidebar({ selectedRoomId }: ChatSidebarProps) {
  const router = useRouter()
  const { session, user: currentUser } = useAuth()
  const currentUserId = session?.user?.id
  const { createEncryptedRoomKeys, loadRoomKey, hasRoomKey, decrypt } = useCrypto()
  const [creatingDMForUserId, setCreatingDMForUserId] = useState<string | null>(null)
  const [decryptedPreviews, setDecryptedPreviews] = useState<Record<string, string>>({})

  const { data: roomsResponse, isLoading: roomsLoading } = useChatControllerGetRooms()

  const { networkUsers, isLoading: networkLoading } = useNetworkUsers()

  const rooms = roomsResponse?.data || []

  useEffect(() => {
    if (rooms.length === 0) return

    const loadAndDecrypt = async () => {
      await Promise.all(
        rooms.map(async (room) => {
          if (hasRoomKey(room.id)) return
          const myParticipant = room.participants?.find((p) => p.userId === currentUserId)
          const encryptedRoomKey = myParticipant?.encryptedRoomKey
          if (encryptedRoomKey) {
            await loadRoomKey(room.id, encryptedRoomKey).catch(console.error)
          }
        }),
      )

      const entries = await Promise.all(
        rooms.map(async (room) => {
          const lastMsg = room.messages?.[0]
          const isTextual = lastMsg?.type === 'TEXT' || lastMsg?.type === 'LINK'
          if (!lastMsg?.content || !isTextual) return [room.id, lastMsg?.content ?? ''] as const
          if (!hasRoomKey(room.id)) {
            const myParticipant = room.participants?.find((p) => p.userId === currentUserId)
            const isRoomEncrypted = !!myParticipant?.encryptedRoomKey
            return [room.id, isRoomEncrypted ? '' : lastMsg.content] as const
          }
          try {
            const plaintext = await decrypt(room.id, lastMsg.content)
            return [room.id, plaintext] as const
          } catch {
            return [room.id, ''] as const
          }
        }),
      )

      setDecryptedPreviews(Object.fromEntries(entries))
    }

    loadAndDecrypt()
  }, [rooms]) // eslint-disable-line react-hooks/exhaustive-deps

  // Create DM mutation
  const { mutateAsync: createDM } = useCreateDM()

  const handleNetworkUserClick = async (user: any) => {
    try {
      setCreatingDMForUserId(user.id)

      // Check if a DM room already exists with this user
      const existingRoom = rooms.find(
        (room: any) =>
          room.type === 'DM' && room.participants?.some((p: any) => p.userId === user.id),
      )

      if (existingRoom) {
        // Navigate directly to existing room
        router.push(`/chat/${existingRoom.id}`)
      } else {
        // Build encrypted room keys for both participants if public keys are available
        let encryptedRoomKeys: { userId: string; encryptedKey: string }[] | undefined

        if (currentUser?.publicKey && user.publicKey) {
          encryptedRoomKeys = await createEncryptedRoomKeys([
            { userId: currentUserId!, publicKeyJwk: currentUser.publicKey },
            { userId: user.id, publicKeyJwk: user.publicKey },
          ])
        }

        // Create new DM room
        const response = await createDM({
          data: {
            type: 'DM',
            participantIds: [user.id],
            encryptedRoomKeys,
          },
        })
        // Navigate to the created room
        router.push(`/chat/${response.data.id}`)
      }
    } catch (error) {
      console.error('Failed to create DM:', error)
    } finally {
      setCreatingDMForUserId(null)
    }
  }

  const { socketRef, presence } = useChatSocket()
  // eslint-disable-next-line react-hooks/refs
  const { typingByRoom } = useGlobalTypingIndicator(socketRef.current, currentUserId)

  // Filter out network users who already have a DM room with messages
  const filteredNetworkUsers = useMemo(() => {
    return networkUsers.filter((user) => {
      const existingRoom = rooms.find(
        (room) => room.type === 'DM' && room.participants.some((p) => p.userId === user.id),
      )
      return !existingRoom || !existingRoom.messages || existingRoom.messages.length === 0
    })
  }, [networkUsers, rooms])

  // Filter rooms to only show those with messages
  const roomsWithMessages = useMemo(() => {
    return rooms.filter((room) => room.messages && room.messages.length > 0)
  }, [rooms])

  // New group rooms (no messages yet) shown in the Network section
  const emptyGroupRooms = useMemo(() => {
    return rooms.filter(
      (room) => room.type === 'GROUP' && (!room.messages || room.messages.length === 0),
    )
  }, [rooms])

  if (roomsLoading || networkLoading) {
    return (
      <Card className="flex flex-col h-full border-none gap-0 rounded-none backdrop-blur bg-background/95 py-2 shadow-none">
        <div className="flex flex-col gap-2 p-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg bg-muted" />
          ))}
        </div>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col h-full border-none gap-0 rounded-none backdrop-blur bg-background/95 py-2 shadow-none">
      <ScrollArea className="flex-1 min-h-0 [&>[data-radix-scroll-area-viewport]>div]:block! [&>[data-radix-scroll-area-viewport]>div]:w-full!">
        <div className="flex flex-col pb-20">
          {/* Active Conversations */}
          {roomsWithMessages.length > 0 && (
            <div className="px-4 py-2 mt-2">
              <h3 className="text-[0.625rem] font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <MessageSquare className="h-3 w-3" /> Recent Chats
              </h3>
            </div>
          )}

          {roomsWithMessages.map((room) => {
            const lastMessage = room.messages?.[0]
            const isSelected = selectedRoomId === room.id
            const otherParticipant =
              room.type === 'DM' ? room.participants?.find((p) => p.userId !== currentUserId) : null
            const displayName = otherParticipant?.user?.name ?? room.name ?? 'Chat Room'
            const displayImage = otherParticipant?.user?.image ?? room.imageUrl ?? ''

            const roomTypingUsers = typingByRoom.get(room.id || '') || []

            const isOnline = otherParticipant
              ? presence.get(otherParticipant.userId)?.status === 1
              : false

            return (
              <button
                key={room.id}
                onClick={() => router.push(`/chat/${room.id}`)}
                className={cn(
                  'relative w-full flex items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-accent/50',
                  isSelected &&
                    'bg-accent/50 before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:bg-primary',
                )}
              >
                <Avatar
                  className={cn('h-10 w-10 rounded-[6px]', isOnline && 'ring-2 ring-green-500')}
                >
                  <AvatarImage src={displayImage} alt={displayName} />
                  <AvatarFallback className="text-xs bg-border text-foreground rounded-none font-mono font-medium">
                    {displayName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="grid grid-cols-[1fr_auto] items-center gap-2 min-w-0 overflow-hidden">
                    <span className="font-medium truncate text-sm min-w-0">{displayName}</span>
                    {lastMessage && (
                      <span className="text-[0.625rem] text-muted-foreground whitespace-nowrap">
                        {format(new Date(lastMessage.createdAt), 'h:mm a')}
                      </span>
                    )}
                  </div>
                  {roomTypingUsers.length > 0 ? (
                    <SidebarTypingIndicator />
                  ) : lastMessage ? (
                    <div className="text-xs text-muted-foreground opacity-70 mt-0.5 flex items-center gap-1 min-w-0 overflow-hidden">
                      {lastMessage.type === 'IMAGE' ? (
                        <>
                          <ImageIcon className="size-3 shrink-0" />
                          <span>Photo</span>
                        </>
                      ) : lastMessage.type === 'FILE' ? (
                        <>
                          <FileIcon className="size-3 shrink-0" />
                          <span>File</span>
                        </>
                      ) : (
                        <span className="truncate">
                          {decryptedPreviews[room.id] ?? lastMessage.content}
                        </span>
                      )}
                    </div>
                  ) : null}
                </div>
              </button>
            )
          })}

          {/* New Conversations (Network) */}
          {(filteredNetworkUsers.length > 0 || emptyGroupRooms.length > 0) && (
            <>
              {roomsWithMessages.length > 0 && <Separator className="my-2" />}
              <div className="px-4 py-2 mt-2">
                <h3 className="text-[0.625rem] font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Users className="h-3 w-3" /> Network
                </h3>
              </div>

              {/* Empty group rooms */}
              {emptyGroupRooms.map((room) => {
                const isSelected = selectedRoomId === room.id
                const roomTypingUsers = typingByRoom.get(room.id) || []
                return (
                  <button
                    key={room.id}
                    onClick={() => router.push(`/chat/${room.id}`)}
                    className={cn(
                      'relative w-full flex items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-accent/50',
                      isSelected &&
                        'bg-accent/50 before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:bg-primary',
                    )}
                  >
                    <Avatar className="h-10 w-10 rounded-[6px]">
                      <AvatarImage src={room.imageUrl || ''} />
                      <AvatarFallback className="text-xs bg-border text-foreground rounded-none font-mono font-medium">
                        {(room.name ?? 'G').substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <span className="font-medium truncate text-sm block">
                        {room.name ?? 'Group Chat'}
                      </span>
                      {roomTypingUsers.length > 0 ? (
                        <SidebarTypingIndicator />
                      ) : (
                        <span className="text-xs text-muted-foreground mt-0.5 block">
                          Say something!
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}

              {filteredNetworkUsers.map((user) => {
                // Check if this user's DM room is currently selected
                const userRoom = rooms.find(
                  (room) =>
                    room.type === 'DM' && room.participants.some((p) => p.userId === user.id),
                )
                const isSelected = userRoom && selectedRoomId === userRoom.id
                const roomTypingUsers = userRoom ? typingByRoom.get(userRoom.id) || [] : []
                const isOnline = presence.get(user.id)?.status === 1

                return (
                  <button
                    key={user.id}
                    onClick={() => handleNetworkUserClick(user)}
                    disabled={creatingDMForUserId === user.id}
                    className={cn(
                      'relative flex items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-accent/50 group disabled:opacity-50 disabled:cursor-not-allowed',
                      isSelected &&
                        'bg-accent/50 before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:bg-primary',
                    )}
                  >
                    <Avatar
                      className={cn('h-10 w-10 rounded-[6px]', isOnline && 'ring-2 ring-green-500')}
                    >
                      <AvatarImage src={user.image || ''} alt={user.name} />
                      <AvatarFallback className="text-xs rounded-none bg-border text-foreground font-mono font-medium">
                        {user.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <span className="font-medium truncate text-sm block">{user.name}</span>
                      {roomTypingUsers.length > 0 ? (
                        <SidebarTypingIndicator />
                      ) : (
                        <span className="text-xs text-muted-foreground mt-0.5 block">
                          {user.relationship === 'mutual'
                            ? 'Mutual connection • Say hello!'
                            : 'Start a conversation'}
                        </span>
                      )}
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      {creatingDMForUserId === user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : (
                        <Users className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </button>
                )
              })}
            </>
          )}

          {roomsWithMessages.length === 0 &&
            filteredNetworkUsers.length === 0 &&
            emptyGroupRooms.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No conversations yet
              </div>
            )}
        </div>
      </ScrollArea>
    </Card>
  )
}
