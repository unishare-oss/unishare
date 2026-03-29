import { useEffect, useRef, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useInView } from 'react-intersection-observer'
import {
  useChatControllerGetMessagesInfinite,
  useChatControllerGetRoom,
  getChatControllerGetMessagesInfiniteQueryKey,
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
import { useSendMessage, useCreateRoom } from '@/hooks/use-chat-mutations'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowLeft, PanelRightOpen, PanelRightClose } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChatMessagesSkeleton } from './chat-messages-skeleton'
import { cn } from '@/lib/utils'
import { ChatInput } from './chat-input'
import { ChatHeader } from './chat-header'
import { ChatInfoPane } from './chat-info-pane'
import { ChatMessageBubble } from './chat-message-bubble'
import { Loader2 } from 'lucide-react'

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

  // Fetch messages with infinite scroll (only if roomId exists)
  const {
    data: messagesData,
    isLoading: messagesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useChatControllerGetMessagesInfinite(
    roomId || '',
    {
      limit: 50,
      direction: 'desc', // Fetch newest first, will reverse for display
    },
    {
      query: {
        enabled: !!roomId,
        getNextPageParam: (lastPage) => {
          return lastPage.data.hasMore ? lastPage.data.nextCursor : undefined
        },
      },
    },
  )

  // Intersection observer for loading more messages
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: '100px',
  })

  // Load more when scroll trigger is in view
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  // Create room mutation (only for new chats)
  const { mutateAsync: createRoom } = useCreateRoom({ user, targetUser, targetUserId })

  // Send message mutation
  const { mutate: sendMessage, isPending: isSending } = useSendMessage({ roomId, user })

  // Flatten all pages and reverse to show oldest first
  const initialMsgs = useMemo(() => {
    if (!messagesData?.pages) return []
    return messagesData.pages.flatMap((page) => page.data.items).reverse() // Reverse because we fetch desc but display asc
  }, [messagesData])

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

    const messagesQueryKey = getChatControllerGetMessagesInfiniteQueryKey(roomId, {
      limit: 50,
      direction: 'desc',
    })

    // Add socket message to the first page (most recent)
    queryClient.setQueryData(messagesQueryKey, (old: any) => {
      if (!old?.pages) return old

      const firstPage = old.pages[0]
      if (!firstPage?.data?.items) return old

      // Check if message already exists
      const exists = firstPage.data.items.some(
        (m: ChatMessageEntity) => m.id === lastSocketMessage.id,
      )
      if (exists) return old

      // Add to the beginning of first page (newest messages)
      return {
        ...old,
        pages: [
          {
            ...firstPage,
            data: {
              ...firstPage.data,
              items: [lastSocketMessage, ...firstPage.data.items],
            },
          },
          ...old.pages.slice(1),
        ],
      }
    })
  }, [lastSocketMessage, roomId, queryClient, user])

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

          // Set optimistic message in cache (for infinite query)
          queryClient.setQueryData(
            getChatControllerGetMessagesInfiniteQueryKey(newRoomId, {
              limit: 50,
              direction: 'desc',
            }),
            {
              pages: [
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
                    nextCursor: null,
                  },
                  status: 200,
                },
              ],
              pageParams: [undefined],
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
                {/* Load more trigger (at top for loading older messages) */}
                {hasNextPage && (
                  <div ref={loadMoreRef} className="flex justify-center py-2">
                    {isFetchingNextPage && (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    )}
                  </div>
                )}

                {/* Conversation Start Header */}
                {displayUser && !hasNextPage && (
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
                    <ChatMessageBubble
                      key={msg.id || i}
                      message={msg}
                      isMe={isMe}
                      showAvatar={showAvatar}
                      currentUserId={user?.id}
                    />
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
