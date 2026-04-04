import { useEffect, useRef, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

import { useInView } from 'react-intersection-observer'
import {
  useChatControllerGetMessagesInfinite,
  useChatControllerGetRoom,
  getChatControllerGetMessagesInfiniteQueryKey,
} from '@/src/lib/api/generated/chat/chat'
import type {
  ChatMessageEntity,
  ChatRoomParticipantEntity,
} from '@/src/lib/api/generated/unishareAPI.schemas'
import { useAuth } from '@/contexts/auth-context'
import { useSendMessage } from '@/hooks/use-chat-mutations'
import { useScrollPositionRestore } from '@/hooks/use-scroll-position-restore'
import { useGlobalTypingIndicator, useEmitTyping } from '@/hooks/use-typing-indicator'
import { addMessageToInfiniteCache } from '@/lib/utils/infinite-query-cache'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ArrowLeft, PanelRightOpen, PanelRightClose, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChatMessagesSkeleton } from './chat-messages-skeleton'
import { TypingIndicator } from './typing-indicator'
import { cn } from '@/lib/utils'
import { ChatInput } from './chat-input'
import { ChatHeader } from './chat-header'
import { ChatInfoPane } from './chat-info-pane'
import { ChatMessageBubble } from './chat-message-bubble'
import { Loader2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { Socket } from 'socket.io-client'

interface UnifiedChatWindowProps {
  roomId?: string
  lastSocketMessage?: ChatMessageEntity
  isConnected?: boolean
  socket: Socket | null
}

export function UnifiedChatWindow({
  roomId,
  lastSocketMessage,
  isConnected = true,
  socket,
}: UnifiedChatWindowProps) {
  const { user, session } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [content, setContent] = useState('')
  const [infoPaneOpen, setInfoPaneOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showDisconnected, setShowDisconnected] = useState(false)

  // Force scroll to bottom immediately on initial load (before render completes)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const hasScrolledInitiallyRef = useRef(false)

  // Callback ref to capture the ScrollArea viewport
  const setScrollContainer = (node: HTMLDivElement | null) => {
    if (node) {
      scrollContainerRef.current = node.querySelector(
        '[data-radix-scroll-area-viewport]',
      ) as HTMLDivElement
    }
  }

  // Global typing indicator (tracks all rooms)
  const { typingByRoom } = useGlobalTypingIndicator(socket, user?.id)

  // Emit typing for current room
  useEmitTyping(socket, roomId || '', content.trim())

  // Only show disconnected banner after 5s of being offline to avoid flashing on brief drops
  useEffect(() => {
    const delay = isConnected ? 0 : 5000
    const timer = setTimeout(() => setShowDisconnected(!isConnected), delay)
    return () => clearTimeout(timer)
  }, [isConnected])

  // Fetch existing room data
  const { data: roomResponse, isLoading: roomLoading } = useChatControllerGetRoom(roomId || '', {
    query: { enabled: !!roomId },
  })

  const room = roomResponse?.data

  // Determine the other participant
  const otherParticipant = room?.participants?.find(
    (p: ChatRoomParticipantEntity) => p.userId !== user?.id,
  )

  const headerUser = otherParticipant?.user
    ? {
        ...otherParticipant.user,
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
  const { ref: loadMoreRef, inView } = useInView()

  // Scroll position restoration hook
  const { prepareForLoad, isLoadingMore } = useScrollPositionRestore({
    scrollRef: scrollContainerRef,
    isFetchingNextPage,
  })

  // Load more when scroll trigger is in view
  useEffect(() => {
    // Don't trigger if we're already loading or just finished loading
    if (inView && hasNextPage && !isFetchingNextPage && !isLoadingMore.current) {
      prepareForLoad()
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage, prepareForLoad, isLoadingMore])

  // Send message mutation
  const { mutate: sendMessage } = useSendMessage({ roomId, user })

  // Flatten all pages and reverse to show oldest first
  const initialMsgs = useMemo(() => {
    if (!messagesData?.pages) return []
    return messagesData.pages.flatMap((page) => page.data.items).reverse() // Reverse because we fetch desc but display asc
  }, [messagesData])

  const messages = useMemo(() => {
    if (!searchQuery.trim()) return initialMsgs
    const q = searchQuery.toLowerCase()
    return initialMsgs.filter((m) => m.content && (m.content as string).toLowerCase().includes(q))
  }, [initialMsgs, searchQuery])

  // Scroll to bottom on initial load
  useEffect(() => {
    if (
      scrollContainerRef.current &&
      !messagesLoading &&
      messages.length > 0 &&
      !hasScrolledInitiallyRef.current
    ) {
      // Scroll immediately without setTimeout
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
      hasScrolledInitiallyRef.current = true
    }
  }, [messagesLoading, messages.length])

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
    queryClient.setQueryData(messagesQueryKey, (old: unknown) =>
      addMessageToInfiniteCache(old, lastSocketMessage),
    )
  }, [lastSocketMessage, roomId, queryClient, user])

  // Reset scroll flag when room changes
  useEffect(() => {
    hasScrolledInitiallyRef.current = false
  }, [roomId])

  // Get typing users for current room
  const roomTypingUsers = typingByRoom.get(roomId || '') || []

  // Auto-scroll to bottom for new messages and typing indicators
  useEffect(() => {
    if (scrollContainerRef.current && !isLoadingMore.current && hasScrolledInitiallyRef.current) {
      const isNearBottom =
        scrollContainerRef.current.scrollHeight -
          scrollContainerRef.current.scrollTop -
          scrollContainerRef.current.clientHeight <
        150

      if (isNearBottom) {
        // Scroll immediately for typing indicators, smoothly for regular messages
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
      }
    }
  }, [messages.length, roomTypingUsers.length])

  const handleSend = async () => {
    if (!content.trim() || !roomId) return

    const messageContent = content
    setContent('')

    sendMessage({ id: roomId, data: { content: messageContent, type: 'TEXT' } })
  }

  if (!roomId || roomLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!room) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Chat Header */}
      <div className="flex items-center justify-between border-b pr-3 bg-background">
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
          <ChatHeader user={headerUser} />
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

      {/* Disconnected banner */}
      {showDisconnected && (
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-xs">
          <WifiOff className="size-3 shrink-0" />
          <span>Reconnecting… Messages may be delayed.</span>
        </div>
      )}

      {/* Body: messages + optional info pane */}
      <div className="flex flex-1 overflow-hidden">
        {/* Messages Area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {messagesLoading ? (
            <ChatMessagesSkeleton />
          ) : (
            <ScrollArea ref={setScrollContainer} className="flex-1 min-h-0 p-4">
              <div
                ref={messagesContainerRef}
                className="flex flex-col gap-4 max-w-6xl mx-auto my-1"
              >
                {/* Load more trigger (at top for loading older messages) */}
                {hasNextPage && (
                  <div ref={loadMoreRef} className="flex justify-center py-2">
                    {isFetchingNextPage && (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    )}
                  </div>
                )}

                {/* Conversation Start Header */}
                {otherParticipant?.user && !hasNextPage && (
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
                      {messages.length === 0 ? ' Send a message to start chatting.' : ''}
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

                {/* Typing indicators */}
                {roomTypingUsers.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {roomTypingUsers.map((typingUser) => {
                      const participant = room?.participants?.find(
                        (p) => p.userId === typingUser.userId,
                      )
                      return <TypingIndicator key={typingUser.userId} participant={participant} />
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          <ChatInput value={content} onChange={setContent} onSend={handleSend} />
        </div>

        {/* Info Pane */}
        <div
          className={cn(
            'fixed inset-y-0 right-0 z-50 w-full bg-background shadow-2xl transition-transform duration-300 ease-in-out md:relative md:inset-auto md:z-0 md:translate-x-0 md:shadow-none md:border-l md:transition-[width]',
            infoPaneOpen ? 'translate-x-0 md:w-64' : 'translate-x-full md:w-0',
          )}
        >
          <ChatInfoPane
            room={room}
            messages={messages}
            currentUserId={session?.user?.id}
            isOpen={infoPaneOpen}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onClose={() => setInfoPaneOpen(false)}
          />
        </div>
      </div>
    </div>
  )
}
