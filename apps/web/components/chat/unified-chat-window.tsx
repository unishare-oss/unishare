'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import {
  useChatControllerGetMessages,
  useChatControllerGetRoom,
  useChatControllerSendMessage,
  useChatControllerCreateRoom,
  getChatControllerGetMessagesQueryKey,
  getChatControllerGetRoomsQueryKey,
  getChatControllerGetRoomQueryKey,
} from '@/src/lib/api/generated/chat/chat'
import { useUsersControllerGetById } from '@/src/lib/api/generated/users/users'
import type {
  ChatMessageEntity,
  ChatRoomParticipantEntity,
  ChatRoomEntity,
} from '@/src/lib/api/generated/unishareAPI.schemas'
import { useAuth } from '@/contexts/auth-context'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowLeft, PanelRightOpen, PanelRightClose } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChatMessagesSkeleton } from './chat-messages-skeleton'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ChatInput } from './chat-input'
import { ChatHeader } from './chat-header'
import { ChatInfoPane } from './chat-info-pane'
import { Loader2 } from 'lucide-react'

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi

function renderWithLinks(text: string, isMe: boolean) {
  const parts = text.split(URL_REGEX)
  const urls = text.match(URL_REGEX) ?? []
  return parts.flatMap((part, i) => [
    part,
    urls[i] ? (
      <a
        key={i}
        href={urls[i]}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'underline underline-offset-2 break-all hover:opacity-80',
          isMe ? 'text-primary-foreground/90' : 'text-primary',
        )}
      >
        {urls[i]}
      </a>
    ) : null,
  ])
}

interface UnifiedChatWindowProps {
  roomId?: string
  targetUserId?: string
  lastSocketMessage?: ChatMessageEntity
}

export function UnifiedChatWindow({
  roomId,
  targetUserId,
  lastSocketMessage,
}: UnifiedChatWindowProps) {
  const { user, session } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [content, setContent] = useState('')
  const [infoPaneOpen, setInfoPaneOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const isNewChat = !roomId && !!targetUserId

  // Fetch existing room data (only if roomId exists)
  const { data: roomResponse } = useChatControllerGetRoom(roomId || '', {
    query: { enabled: !!roomId },
  })

  const existingRoom = roomResponse?.data

  // Fetch target user data (only for new chats)
  const { data: userResponse, isLoading: userLoading } = useUsersControllerGetById(
    targetUserId || '',
    {
      query: { enabled: isNewChat },
    },
  )
  const targetUser = userResponse?.data

  // Determine the other participant
  const otherParticipant = existingRoom?.participants?.find(
    (p: ChatRoomParticipantEntity) => p.userId !== user?.id,
  )
  const displayUser = isNewChat ? targetUser : otherParticipant?.user

  const headerUser = displayUser
    ? {
        ...displayUser,
        isActive: false,
        lastSeenAt: undefined,
      }
    : undefined

  // Fetch messages (only if roomId exists)
  const { data: initialMessages, isLoading: messagesLoading } = useChatControllerGetMessages(
    roomId || '',
    {
      limit: 50,
      direction: 'asc',
    },
    {
      query: { enabled: !!roomId },
    },
  )

  // Create room mutation (only for new chats)
  const { mutateAsync: createRoom } = useChatControllerCreateRoom({
    mutation: {
      onMutate: async (variables) => {
        const roomsQueryKey = getChatControllerGetRoomsQueryKey()

        // Cancel outgoing refetches
        await queryClient.cancelQueries({ queryKey: roomsQueryKey })

        // Snapshot previous value for rollback
        const previousRooms = queryClient.getQueryData(roomsQueryKey)

        const tempId = 'temp-room-' + Date.now()

        // Optimistically add room to cache
        queryClient.setQueryData(roomsQueryKey, (old: any) => {
          if (!old?.data?.items) return old

          const optimisticRoom = {
            id: tempId,
            type: variables.data.type,
            name: variables.data.name || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            participants:
              variables.data.participantIds?.map((id) => ({
                userId: id,
                user: id === targetUserId ? targetUser : user,
              })) || [],
            user: user,
          }

          return {
            ...old,
            data: {
              ...old.data,
              items: [optimisticRoom, ...old.data.items],
            },
          }
        })

        return { previousRooms, roomsQueryKey, tempId }
      },
      onSuccess: (data, _variables, context) => {
        if (!context?.roomsQueryKey) return

        const realRoom = data.data

        // Replace optimistic room with real one
        queryClient.setQueryData(context.roomsQueryKey, (old: any) => {
          if (!old?.data?.items) return old

          return {
            ...old,
            data: {
              ...old.data,
              items: old.data.items.map((item: any) => {
                if (item.id === context.tempId) {
                  return realRoom
                }
                return item
              }),
            },
          }
        })

        // Refresh to ensure consistency
        queryClient.invalidateQueries({ queryKey: getChatControllerGetRoomsQueryKey() })
      },
      onError: (_error, _variables, context) => {
        // Rollback on error
        if (context?.previousRooms) {
          queryClient.setQueryData(context.roomsQueryKey, context.previousRooms)
        }
      },
    },
  })

  // Send message mutation
  const { mutate: sendMessage, isPending: isSending } = useChatControllerSendMessage({
    mutation: {
      onMutate: async (variables) => {
        if (!roomId) return

        const messagesQueryKey = getChatControllerGetMessagesQueryKey(roomId, {
          limit: 50,
          direction: 'asc',
        })

        const roomsQueryKey = getChatControllerGetRoomsQueryKey()

        // Cancel outgoing refetches
        await queryClient.cancelQueries({ queryKey: messagesQueryKey })
        await queryClient.cancelQueries({ queryKey: roomsQueryKey })

        // Snapshot previous values for rollback
        const previousMessages = queryClient.getQueryData(messagesQueryKey)
        const previousRooms = queryClient.getQueryData(roomsQueryKey)

        const tempId = 'temp-' + Date.now()

        // Optimistically add message to cache
        queryClient.setQueryData(messagesQueryKey, (old: any) => {
          if (!old?.data?.items) return old

          const optimisticMessage: ChatMessageEntity = {
            id: tempId,
            roomId: variables.id,
            userId: user?.id || null,
            type: variables.data.type as any,
            content: variables.data.content || null,
            imageUrl: null,
            linkUrl: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            user: user
              ? {
                  id: user.id,
                  name: user.name,
                  image: user.image,
                }
              : undefined,
          }

          return {
            ...old,
            data: {
              ...old.data,
              items: [...old.data.items, optimisticMessage],
            },
          }
        })

        // Optimistically update room in sidebar (move to top + update preview)
        queryClient.setQueryData(roomsQueryKey, (old: any) => {
          if (!old?.data) return old

          const currentRoom = old.data.find((r: ChatRoomEntity) => r.id === roomId)
          if (!currentRoom) return old

          console.log(currentRoom)

          // Create optimistic message matching ChatMessageEntity structure
          const optimisticMessage: Partial<ChatMessageEntity> = {
            id: tempId,
            roomId: roomId,
            userId: user?.id || null,
            content: variables.data.content || null,
            type: variables.data.type as any,
            createdAt: new Date().toISOString(),
          }

          const updatedRoom: ChatRoomEntity = {
            ...currentRoom,
            updatedAt: new Date().toISOString(),
            messages: [optimisticMessage],
          }

          // Remove room from current position and add to top
          const otherRooms = old.data.filter((r: ChatRoomEntity) => r.id !== roomId)

          return {
            ...old,
            data: [updatedRoom, ...otherRooms],
          }
        })

        return { previousMessages, previousRooms, messagesQueryKey, roomsQueryKey, tempId }
      },
      onSuccess: (data, variables, context) => {
        if (!context?.messagesQueryKey) return

        const realMessage = data.data

        // Replace optimistic message with real one in chat window
        queryClient.setQueryData(context.messagesQueryKey, (old: any) => {
          if (!old?.data?.items) return old

          return {
            ...old,
            data: {
              ...old.data,
              items: old.data.items.map((item: any) => {
                // Replace ONLY the optimistic message
                if (item.id === context.tempId) {
                  return realMessage
                }
                return item
              }),
            },
          }
        })

        // Replace optimistic message with real one in room preview
        queryClient.setQueryData(context.roomsQueryKey, (old: any) => {
          if (!old?.data) return old

          return {
            ...old,
            data: old.data.map((room: any) => {
              if (room.id === roomId) {
                return {
                  ...room,
                  updatedAt: realMessage.createdAt,
                  messages: [
                    {
                      id: realMessage.id,
                      content: realMessage.content,
                      type: realMessage.type,
                      createdAt: realMessage.createdAt,
                    },
                  ],
                }
              }
              return room
            }),
          }
        })
      },
      onError: (_error, _variables, context) => {
        // Rollback on error
        if (context?.previousMessages && roomId) {
          queryClient.setQueryData(context.messagesQueryKey, context.previousMessages)
        }
        if (context?.previousRooms) {
          queryClient.setQueryData(context.roomsQueryKey, context.previousRooms)
        }
      },
    },
  })

  const initialMsgs = useMemo(() => initialMessages?.data?.items ?? [], [initialMessages])

  const messages = useMemo(() => {
    if (!searchQuery.trim()) return initialMsgs
    const q = searchQuery.toLowerCase()
    return initialMsgs.filter((m) => m.content && (m.content as any).toLowerCase().includes(q))
  }, [initialMsgs, searchQuery])

  // Socket message handling (only for existing rooms)
  useEffect(() => {
    if (
      !roomId ||
      !lastSocketMessage ||
      lastSocketMessage.roomId !== roomId ||
      lastSocketMessage.user?.id === user!.id
    )
      return

    const messagesQueryKey = getChatControllerGetMessagesQueryKey(roomId, {
      limit: 50,
      direction: 'asc',
    })

    // Add socket message directly to cache
    queryClient.setQueryData(messagesQueryKey, (old: any) => {
      if (!old?.data?.items) return old

      // Check if message already exists
      const exists = old.data.items.some((m: ChatMessageEntity) => m.id === lastSocketMessage.id)
      if (exists) return old

      return {
        ...old,
        data: {
          ...old.data,
          items: [...old.data.items, lastSocketMessage],
        },
      }
    })
  }, [lastSocketMessage, roomId, queryClient])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages])

  // Create mock room for new chats (info pane display)
  const mockRoom: ChatRoomEntity | undefined =
    isNewChat && targetUser
      ? {
          id: 'new-room-' + targetUserId,
          type: 'DM',
          name: targetUser.name,
          imageUrl: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          participants: [
            {
              id: 'mock-participant-' + targetUserId,
              roomId: 'new-room-' + targetUserId,
              userId: targetUserId || '',
              lastReadAt: new Date().toISOString(),
              joinedAt: new Date().toISOString(),
              user: {
                id: targetUser.id,
                name: targetUser.name,
                image: targetUser.image,
              },
            },
          ],
          messages: [],
        }
      : undefined

  const displayRoom = existingRoom || mockRoom

  //TODO: opt this
  const handleSend = async () => {
    if (!content.trim()) return

    const messageContent = content
    setContent('') // Clear input immediately

    if (isNewChat && targetUserId) {
      // Create room first, then send message
      createRoom({
        data: {
          type: 'DM',
          participantIds: [targetUserId],
          name: targetUser?.name,
        },
      })
        .then(async (roomRes) => {
          const newRoomId = roomRes.data.id

          // Prefetch room data
          queryClient.setQueryData(getChatControllerGetRoomQueryKey(newRoomId), roomRes)

          // Set optimistic message in cache
          queryClient.setQueryData(
            getChatControllerGetMessagesQueryKey(newRoomId, {
              limit: 50,
              direction: 'asc',
            }),
            {
              data: {
                items: [
                  {
                    id: 'temp-' + Date.now(),
                    roomId: newRoomId,
                    userId: session?.user?.id,
                    type: 'TEXT',
                    content: messageContent,
                    imageUrl: null,
                    linkUrl: null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    user: session?.user
                      ? {
                          id: session.user.id,
                          name: session.user.name,
                          image: session.user.image,
                        }
                      : undefined,
                  },
                ],
                hasMore: false,
              },
            },
          )

          // Redirect immediately
          router.push(`/chat/${newRoomId}`)

          // Send message in background
          sendMessage({
            id: newRoomId,
            data: { content: messageContent, type: 'TEXT' },
          })
        })
        .catch((error) => {
          console.error('Failed to start conversation:', error)
          setContent(messageContent) // Restore content on error
        })
    } else if (roomId) {
      // Existing room - just send message
      sendMessage({ id: roomId, data: { content: messageContent, type: 'TEXT' } })
    }
  }

  if ((isNewChat && userLoading) || (!isNewChat && !roomId)) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Chat Header */}
      <div className="flex items-center justify-between border-b pr-3 bg-background/95 backdrop-blur">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden ml-1"
            onClick={() => router.push('/chat')}
            aria-label="Back to chats"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <ChatHeader user={headerUser} isNew={isNewChat} />
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setInfoPaneOpen((v) => !v)}
          aria-label="Toggle info pane"
        >
          {infoPaneOpen ? (
            <PanelRightClose className="size-4" strokeWidth={1.5} />
          ) : (
            <PanelRightOpen className="size-4" strokeWidth={1.5} />
          )}
        </Button>
      </div>

      {/* Body: messages + optional info pane */}
      <div className="flex flex-1 overflow-hidden pb-16 md:pb-0">
        {/* Messages Area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {messagesLoading ? (
            <ChatMessagesSkeleton />
          ) : (
            <ScrollArea ref={scrollRef} className="flex-1 min-h-0 p-4">
              <div className="flex flex-col gap-4 max-w-6xl mx-auto">
                {/* Conversation Start Header */}
                {displayUser && (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <Avatar className="h-20 w-20 mb-4 rounded-[6px]">
                      <AvatarImage src={displayUser.image || ''} />
                      <AvatarFallback className="text-xl rounded-none bg-border text-foreground font-mono font-medium">
                        {displayUser.name?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <h2 className="text-xl font-bold">{displayUser.name}</h2>
                    <p className="text-sm text-muted-foreground max-w-xs mt-2">
                      This is the beginning of your conversation with {displayUser.name}. Send a
                      message to start chatting.
                    </p>
                  </div>
                )}

                {messages.map((msg, i) => {
                  const isMe = msg.userId === user?.id
                  const showAvatar = i === 0 || messages[i - 1].userId !== msg.userId

                  return (
                    <div
                      key={msg.id || i}
                      className={cn('flex items-end gap-2', isMe ? 'flex-row-reverse' : 'flex-row')}
                    >
                      {!isMe && (
                        <div className="w-8">
                          {showAvatar && (
                            <Avatar className="h-8 w-8 mb-1 rounded-[6px]">
                              <AvatarImage src={msg.user?.image || ''} />
                              <AvatarFallback className="text-[10px] rounded-none bg-border text-foreground font-mono font-medium">
                                {msg.user?.name?.[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      )}

                      <div
                        className={cn(
                          'max-w-[70%] px-3 py-2 rounded-2xl text-[13px] shadow-sm transition-all',
                          isMe
                            ? 'bg-primary text-primary-foreground rounded-br-sm'
                            : 'bg-muted text-foreground rounded-bl-sm',
                        )}
                      >
                        {!isMe && showAvatar && (
                          <span className="text-[10px] font-semibold block mb-1 opacity-70">
                            {msg.user?.name}
                          </span>
                        )}
                        <p className="whitespace-pre-wrap break-words">
                          {renderWithLinks(msg.content ?? '', isMe)}
                        </p>
                        <span
                          className={cn(
                            'text-[9px] block mt-1 opacity-60',
                            isMe ? 'text-right' : 'text-left',
                          )}
                        >
                          {format(new Date(msg.createdAt), 'HH:mm')}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          )}

          <ChatInput
            value={content}
            onChange={setContent}
            onSend={handleSend}
            placeholder={isNewChat ? 'Say hello...' : undefined}
          />
        </div>

        {/* Info Pane */}
        <div
          className={cn(
            'relative border-l bg-background/95 overflow-hidden transition-all duration-300 ease-in-out flex-shrink-0 h-full',
            infoPaneOpen ? 'w-64' : 'w-0',
          )}
        >
          <ChatInfoPane
            room={displayRoom}
            messages={messages}
            currentUserId={session?.user?.id}
            isOpen={infoPaneOpen}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>
      </div>
    </div>
  )
}
