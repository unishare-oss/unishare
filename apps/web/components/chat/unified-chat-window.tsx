import { useEffect, useRef, useState, useMemo, RefObject } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { format, isToday, isYesterday, isSameDay } from 'date-fns'
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
import { useSendMessage, useEditMessage, useDeleteMessage } from '@/hooks/use-chat-mutations'
import { useScrollPositionRestore } from '@/hooks/use-scroll-position-restore'
import { useGlobalTypingIndicator, useEmitTyping } from '@/hooks/use-typing-indicator'
import { addMessageToInfiniteCache } from '@/lib/utils/infinite-query-cache'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ArrowLeft, PanelRightOpen, PanelRightClose, WifiOff, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChatMessagesSkeleton } from './chat-messages-skeleton'
import { TypingIndicator } from './typing-indicator'
import { SidebarTypingIndicator } from './sidebar-typing-indicator'
import { cn } from '@/lib/utils'
import { ChatInput } from './chat-input'
import { ChatHeader } from './chat-header'
import { ChatInfoPane } from './chat-info-pane'
import { ChatMessageBubble } from './chat-message-bubble'
import { Loader2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { Socket } from 'socket.io-client'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { useChatLastSeenStore } from '@/lib/store'

// Helper function to format date separator
function getDateSeparatorText(date: Date): string {
  if (isToday(date)) {
    return 'Today'
  }
  if (isYesterday(date)) {
    return 'Yesterday'
  }
  // Show full date for older messages
  return format(date, 'MMMM d, yyyy')
}

// Helper function to check if we should show a date separator
function shouldShowDateSeparator(
  currentMsg: ChatMessageEntity,
  previousMsg: ChatMessageEntity | undefined,
): boolean {
  if (!previousMsg) return true

  const currentDate = new Date(currentMsg.createdAt)
  const previousDate = new Date(previousMsg.createdAt)

  return !isSameDay(currentDate, previousDate)
}

interface UnifiedChatWindowProps {
  roomId?: string
  lastSocketMessage?: ChatMessageEntity
  isConnected?: boolean
  socket: RefObject<Socket | null>
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
  const [editingMessage, setEditingMessage] = useState<ChatMessageEntity | null>(null)
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessageEntity | null>(null)
  const [infoPaneOpen, setInfoPaneOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showDisconnected, setShowDisconnected] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null)
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [firstUnreadId, setFirstUnreadId] = useState<string | null>(null)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

  const { getLastSeen, setLastSeen } = useChatLastSeenStore()

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
  const { typingByRoom } = useGlobalTypingIndicator(socket.current, user?.id)

  // Emit typing for current room
  useEmitTyping(socket.current, roomId || '', content.trim())

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
  const { mutate: editMessage } = useEditMessage({ roomId: roomId || '' })
  const { mutate: deleteMessage } = useDeleteMessage({ roomId: roomId || '' })

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

  // Scroll to first unread (or bottom) on initial load
  useEffect(() => {
    if (
      !scrollContainerRef.current ||
      messagesLoading ||
      messages.length === 0 ||
      hasScrolledInitiallyRef.current ||
      !roomId
    )
      return

    const lastSeenId = getLastSeen(roomId)

    if (lastSeenId) {
      const idx = messages.findIndex((m) => m.id === lastSeenId)
      // idx === -1 means last-seen is older than loaded page → all 50 are unread
      const unreadMsg = idx === -1 ? messages[0] : (messages[idx + 1] ?? null)

      if (unreadMsg) {
        setFirstUnreadId(unreadMsg.id)
        const el = messagesContainerRef.current?.querySelector(
          `[data-message-id="${unreadMsg.id}"]`,
        ) as HTMLElement | null
        if (el) {
          el.scrollIntoView({ block: 'center' })
        } else {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
        }
        hasScrolledInitiallyRef.current = true
        return
      }
    }

    // No unread messages or no last-seen — scroll to bottom as usual
    scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    hasScrolledInitiallyRef.current = true
  }, [messagesLoading, messages.length, roomId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Track scroll position to show/hide scroll-to-bottom button
  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const handleScroll = () => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      setIsAtBottom(distFromBottom < 100)
    }
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [scrollContainerRef.current]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // Reset scroll flag and unread divider when room changes
  useEffect(() => {
    hasScrolledInitiallyRef.current = false
    setFirstUnreadId(null)
  }, [roomId])

  // Mark messages as read when at bottom
  useEffect(() => {
    if (!isAtBottom || !roomId || messages.length === 0) return
    const lastMsg = messages[messages.length - 1]
    if (lastMsg && !lastMsg.id.startsWith('temp-')) {
      setLastSeen(roomId, lastMsg.id)
    }
  }, [isAtBottom, messages, roomId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Get typing users for current room
  const roomTypingUsers = typingByRoom.get(roomId || '') || []

  // Auto-scroll to bottom when new messages arrive (if already near bottom)
  useEffect(() => {
    if (!scrollContainerRef.current || isLoadingMore.current || !hasScrolledInitiallyRef.current)
      return
    const el = scrollContainerRef.current
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distFromBottom < 150) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages.length])

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior,
      })
    }
  }

  const handleSend = async () => {
    if (!content.trim() || !roomId) return

    const messageContent = content
    setContent('')

    if (editingMessage) {
      if (editingMessage!.content!.trim() === content.trim()) {
        setEditingMessage(null)
        return
      }
      editMessage({ id: editingMessage.id, data: { content: messageContent } })
      setEditingMessage(null)
    } else {
      sendMessage({
        id: roomId,
        data: {
          content: messageContent,
          type: 'TEXT',
          ...(replyingToMessage && { parentId: replyingToMessage.id }),
        },
      })
      setReplyingToMessage(null)
      // Defer scroll so optimistic message renders before we scroll
      requestAnimationFrame(() => scrollToBottom())
    }
  }

  const handleEdit = (message: ChatMessageEntity) => {
    setEditingMessage(message)
    setReplyingToMessage(null) // Clear reply when editing
    setContent(message.content || '')
  }

  const handleReply = (message: ChatMessageEntity) => {
    setReplyingToMessage(message)
    setEditingMessage(null) // Clear edit when replying
    setContent('')
  }

  const handleDelete = (messageId: string) => {
    setMessageToDelete(messageId)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (!messageToDelete) return
    const id = messageToDelete
    setDeleteDialogOpen(false)
    setMessageToDelete(null)
    // Mark as deleting — AnimatePresence plays exit, then we remove from cache
    setDeletingIds((prev) => new Set(prev).add(id))
    setTimeout(() => {
      deleteMessage({ id })
      setDeletingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 400)
  }

  const handleScrollToMessage = async (messageId: string) => {
    const tryScroll = (scrollDelay = 500) => {
      const el = messagesContainerRef.current?.querySelector(
        `[data-message-id="${messageId}"]`,
      ) as HTMLElement | null
      if (!el || !scrollContainerRef.current) return false
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Delay highlight until scroll animation completes
      setTimeout(() => {
        setHighlightedMessageId(messageId)
        setTimeout(() => setHighlightedMessageId(null), 1600)
      }, scrollDelay)
      return true
    }

    if (tryScroll()) return

    // Message not yet in DOM — fetch older pages until found (max 5 pages)
    for (let attempt = 0; attempt < 5; attempt++) {
      if (!hasNextPage) break
      await fetchNextPage()
      await new Promise((resolve) => setTimeout(resolve, 250))
      // Give extra scroll delay after page fetch since DOM just re-rendered
      if (tryScroll(700)) return
    }
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
        <div className="flex flex-col flex-1 overflow-hidden relative">
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

                <AnimatePresence initial={false}>
                  {messages.map((msg, i) => {
                    const isMe = msg.userId === user?.id
                    const showAvatar = i === 0 || messages[i - 1].userId !== msg.userId
                    const showDateSeparator = shouldShowDateSeparator(msg, messages[i - 1])
                    const isDeleting = deletingIds.has(msg.id)

                    return (
                      <motion.div
                        key={msg.id || i}
                        data-message-id={msg.id}
                        layout="position"
                        animate={
                          isDeleting
                            ? {
                                opacity: 0,
                                scale: 0.7,
                                filter: 'blur(6px)',
                                y: isMe ? 10 : -10,
                                transition: { duration: 0.35, ease: [0.4, 0, 1, 1] },
                              }
                            : { opacity: 1, scale: 1, filter: 'blur(0px)', y: 0 }
                        }
                      >
                        {/* Date Separator */}
                        {showDateSeparator && (
                          <div className="flex items-center justify-center my-4">
                            <div className="px-2.5 py-0.5 bg-secondary border border-border rounded-full text-[10px] text-secondary-foreground font-medium">
                              {getDateSeparatorText(new Date(msg.createdAt))}
                            </div>
                          </div>
                        )}

                        {/* Unread divider */}
                        {firstUnreadId === msg.id && (
                          <div className="flex items-center gap-3 my-3">
                            <div className="flex-1 h-px bg-primary/25" />
                            <span className="text-[9px] font-bold font-mono tracking-widest uppercase text-primary bg-primary/10 px-2.5 py-1 rounded-full whitespace-nowrap">
                              ↓ new messages
                            </span>
                            <div className="flex-1 h-px bg-primary/25" />
                          </div>
                        )}

                        {/* Message Bubble */}
                        <ChatMessageBubble
                          message={msg}
                          isMe={isMe}
                          showAvatar={showAvatar}
                          currentUserId={user?.id}
                          isHighlighted={highlightedMessageId === msg.id}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onReply={handleReply}
                          onScrollToMessage={handleScrollToMessage}
                        />
                      </motion.div>
                    )
                  })}
                </AnimatePresence>

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

          {/* Scroll to bottom / typing indicator FAB */}
          {!isAtBottom && (
            <div className="absolute bottom-20 left-0 right-0 z-30 flex justify-center pointer-events-none">
              <button
                className="pointer-events-auto h-8 w-8 rounded-full shadow-md bg-background/95 border border-border hover:bg-accent hover:text-accent-foreground flex items-center justify-center transition-colors"
                onClick={() => scrollToBottom()}
                aria-label="Scroll to bottom"
              >
                {roomTypingUsers.length > 0 ? (
                  <SidebarTypingIndicator />
                ) : (
                  <ArrowDown className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          )}

          <ChatInput
            value={content}
            onChange={setContent}
            onSend={handleSend}
            editingMessage={editingMessage}
            replyingToMessage={replyingToMessage}
            currentUserId={user?.id}
            onCancelEdit={() => {
              setEditingMessage(null)
              setContent('')
            }}
            onCancelReply={() => {
              setReplyingToMessage(null)
              setContent('')
            }}
          />
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete message"
        description="Are you sure you want to delete this message? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDelete}
      />
    </div>
  )
}
