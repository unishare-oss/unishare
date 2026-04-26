import { useEffect, useRef, useState, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { format, isToday, isYesterday, isSameDay } from 'date-fns'
import { useInView } from 'react-intersection-observer'
import { useQueryClient } from '@tanstack/react-query'
import {
  useChatControllerGetRoom,
  useChatControllerMarkAsRead,
  useChatControllerUpgradeEncryption,
  getChatControllerGetRoomQueryKey,
} from '@/src/lib/api/generated/chat/chat'
import type {
  ChatMessageEntity,
  ChatRoomParticipantEntity,
} from '@/src/lib/api/generated/unishareAPI.schemas'
import { useAuth } from '@/contexts/auth-context'
import { useCrypto } from '@/hooks/use-crypto'
import { useDecryptedChatMessages } from '@/hooks/use-decrypted-chat-messages'
import { useScrollManager } from '@/hooks/use-scroll-manager'
import { useChatMessageActions } from '@/hooks/use-chat-message-actions'
import { useChatFileUpload } from '@/hooks/use-chat-file-upload'
import { useGlobalTypingIndicator, useEmitTyping } from '@/hooks/use-typing-indicator'
import { useChatSocket } from '@/hooks/use-chat-socket'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ArrowLeft,
  PanelRightOpen,
  PanelRightClose,
  WifiOff,
  ArrowDown,
  ImageIcon,
  UsersRound,
  UserPlus,
  LockKeyholeOpen,
  ScanLine,
  KeyRound,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChatMessagesSkeleton } from './chat-messages-skeleton'
import { TypingIndicator } from './typing-indicator'
import { SidebarTypingIndicator } from './sidebar-typing-indicator'
import { cn } from '@/lib/utils'
import { ChatInput } from './chat-input'
import { ChatHeader } from './chat-header'
import { ChatInfoPane } from './chat-info-pane'
import { GroupChatDialog } from './group-chat-dialog'
import { ChatMessageBubble } from './chat-message-bubble'
import { ChatConversationStart } from './chat-conversation-start'
import { ChatImageSendModal } from './chat-image-send-modal'
import { ChatFileSendModal } from './chat-file-send-modal'
import { Loader2 } from 'lucide-react'
import { ImportKeysDialog } from './chat-info-pane/key-transfer-dialogs'
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
}

export function UnifiedChatWindow({ roomId }: UnifiedChatWindowProps) {
  const { user, session } = useAuth()
  const { loadRoomKey, hasRoomKey, createEncryptedRoomKeys, hasPrivateKey } = useCrypto()
  const [importKeysOpen, setImportKeysOpen] = useState(false)
  const [keyLoadErrorRoomId, setKeyLoadErrorRoomId] = useState<string | null>(null)
  const keyLoadError = keyLoadErrorRoomId === roomId
  const { presence, isConnected, socketRef: socket } = useChatSocket()
  const router = useRouter()
  const queryClient = useQueryClient()
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const [firstUnreadId, setFirstUnreadId] = useState<string | null>(null)
  const [infoPaneOpen, setInfoPaneOpen] = useState(false)
  const [createGroupOpen, setCreateGroupOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showDisconnected, setShowDisconnected] = useState(false)

  const { setLastSeen, getLastSeen } = useChatLastSeenStore()
  const { mutate: markRoomAsRead } = useChatControllerMarkAsRead()

  // Only show disconnected banner after 5s to avoid flashing on brief drops
  useEffect(() => {
    const delay = isConnected ? 0 : 5000
    const timer = setTimeout(() => setShowDisconnected(!isConnected), delay)
    return () => clearTimeout(timer)
  }, [isConnected])

  // Fetch room data
  const { data: roomResponse, isLoading: roomLoading } = useChatControllerGetRoom(roomId || '', {
    query: { enabled: !!roomId },
  })

  const room = roomResponse?.data

  //for displaying dm chat header
  const { otherParticipant, myParticipant } = useMemo(() => {
    const others =
      room?.participants?.filter((p: ChatRoomParticipantEntity) => p.userId !== user?.id) ?? []
    const mine = room?.participants?.find((p: ChatRoomParticipantEntity) => p.userId === user?.id)
    return { otherParticipant: others[0], myParticipant: mine }
  }, [room?.participants, user?.id])

  const headerUser = otherParticipant?.user ?? undefined
  const headerPresence = otherParticipant?.userId
    ? presence.get(otherParticipant.userId)
    : undefined
  // undefined while room is loading — prevents false ciphertext flash via the unencrypted fast-path
  const isEncrypted = room
    ? !!room.participants?.find((p) => p.userId === user?.id)?.encryptedRoomKey
    : undefined

  // Upgrade mutation — silently upgrades unencrypted rooms when all participants have keys
  const { mutate: upgradeEncryption } = useChatControllerUpgradeEncryption({
    mutation: {
      onSettled: (_data, _error, variables) => {
        if (!variables?.id) return
        queryClient.invalidateQueries({ queryKey: getChatControllerGetRoomQueryKey(variables.id) })
      },
    },
  })

  // True when every participant has a public key (enables auto-upgrade to E2EE for any room type)
  const allParticipantsHaveKeys = useMemo(
    () => !!room?.participants?.length && room.participants.every((p) => p.user?.publicKey),
    [room],
  )

  // Fetch + decrypt messages with infinite scroll
  const {
    messages: decryptedMessages,
    isLoading: messagesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useDecryptedChatMessages(roomId, isEncrypted)

  // When the room is encrypted but the private key isn't on this device, the
  // decryption hook will never produce messages — don't show an infinite skeleton.
  const effectiveMessagesLoading = messagesLoading && !(isEncrypted && !hasPrivateKey)

  // Intersection observer for loading older messages
  const { ref: loadMoreRef, inView } = useInView()

  const messages = useMemo(() => {
    if (!searchQuery.trim()) return decryptedMessages
    const q = searchQuery.toLowerCase()
    return decryptedMessages.filter(
      (m) => m.content && (m.content as string).toLowerCase().includes(q),
    )
  }, [decryptedMessages, searchQuery])

  const unreadCount = useMemo(() => {
    if (!myParticipant || decryptedMessages.length === 0) return 0
    const lastReadAt = new Date(myParticipant.lastReadAt).getTime()
    return decryptedMessages.filter(
      (m) => m.userId !== user?.id && new Date(m.createdAt).getTime() > lastReadAt,
    ).length
  }, [decryptedMessages, myParticipant, user?.id])

  // Typing indicators
  const { typingByRoom } = useGlobalTypingIndicator(socket.current, user?.id)
  const roomTypingUsers = typingByRoom.get(roomId || '') || []

  // Scroll management
  const {
    scrollContainerRef,
    setScrollContainer,
    isAtBottom,
    scrollToBottom,
    isLoadingMore,
    prepareForLoad,
  } = useScrollManager({
    roomId,
    messages,
    messagesLoading: effectiveMessagesLoading,
    isFetchingNextPage,
    roomTypingUsersCount: roomTypingUsers.length,
    messagesContainerRef,
    setFirstUnreadId,
  })

  // Message CRUD actions
  const {
    content,
    setContent,
    editingMessage,
    setEditingMessage,
    replyingToMessage,
    setReplyingToMessage,
    deleteDialogOpen,
    setDeleteDialogOpen,
    highlightedMessageId,
    deletingIds,
    sendMessage,
    handleSend,
    handleEdit,
    handleReply,
    handleDelete,
    confirmDelete,
    handleScrollToMessage,
  } = useChatMessageActions({
    roomId,
    isEncrypted,
    user,
    scrollToBottom,
    messagesContainerRef,
    scrollContainerRef,
    hasNextPage,
    fetchNextPage,
  })

  // Emit typing for current room
  useEmitTyping(socket.current, roomId || '', content.trim())

  // File / image upload
  const {
    pendingImageFile,
    imageModalOpen,
    setImageModalOpen,
    setPendingImageFile,
    pendingFileFile,
    fileModalOpen,
    setFileModalOpen,
    setPendingFileFile,
    isDragging,
    setIsDragging,
    openImageModal,
    openFileModal,
    handleSendImage,
    handleSendFile,
  } = useChatFileUpload({
    roomId,
    replyingToMessage,
    sendMessage,
    setReplyingToMessage,
    scrollToBottom,
  })

  // Load more when scroll trigger comes into view
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage && !isLoadingMore.current) {
      prepareForLoad()
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage, prepareForLoad, isLoadingMore])

  // Load room key into CryptoContext when room data arrives and crypto is ready.
  // Only attempt if hasPrivateKey — avoids a guaranteed throw when the user has no key at all.
  useEffect(() => {
    if (!room || !user?.id || hasRoomKey(room.id) || !hasPrivateKey) return
    const myParticipant = room.participants?.find((p) => p.userId === user.id)
    const encryptedRoomKey = myParticipant?.encryptedRoomKey

    if (encryptedRoomKey) {
      loadRoomKey(room.id, encryptedRoomKey).catch((e) => {
        console.error('Failed to load room key:', e)
        setKeyLoadErrorRoomId(room.id)
      })
    }
  }, [room, user?.id, hasPrivateKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRetryLoadKey = () => {
    if (!room || !user?.id) return
    const myParticipant = room.participants?.find((p) => p.userId === user.id)
    const encryptedRoomKey = myParticipant?.encryptedRoomKey
    if (!encryptedRoomKey) return
    setKeyLoadErrorRoomId(null)
    loadRoomKey(room.id, encryptedRoomKey).catch((e) => {
      console.error('Failed to load room key:', e)
      setKeyLoadErrorRoomId(room.id)
    })
  }

  // Auto-upgrade to E2E encryption when all participants have public keys
  useEffect(() => {
    if (!room || !user?.id || isEncrypted || !allParticipantsHaveKeys) return

    const publicKeys = room.participants!.map((p) => ({
      userId: p.userId,
      publicKeyJwk: p.user!.publicKey!,
    }))

    createEncryptedRoomKeys(publicKeys, room.id)
      .then((encryptedRoomKeys) => {
        upgradeEncryption({ id: room.id, data: { encryptedRoomKeys } })
      })
      .catch(console.error)
  }, [room?.id, isEncrypted, allParticipantsHaveKeys, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset unread divider when room changes
  useEffect(() => {
    setTimeout(() => setFirstUnreadId(null), 0)
  }, [roomId])

  // Mark messages as read when at bottom — only when the last message changes
  useEffect(() => {
    if (!isAtBottom || !roomId || messages.length === 0) return
    const lastMsg = messages[messages.length - 1]
    if (lastMsg && !lastMsg.id.startsWith('temp-') && lastMsg.id !== getLastSeen(roomId)) {
      setLastSeen(roomId, lastMsg.id)
      markRoomAsRead({ id: roomId })
    }
  }, [isAtBottom, messages, roomId]) // eslint-disable-line react-hooks/exhaustive-deps

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
    <div
      className="flex flex-col h-full bg-background relative"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault()
          setIsDragging(true)
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragging(false)
        const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'))
        if (file) openImageModal(file)
      }}
    >
      {/* Drag-drop overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm border-2 border-dashed border-primary rounded-none pointer-events-none">
          <ImageIcon className="size-10 text-primary opacity-80" />
          <p className="text-sm font-medium text-primary">Drop image to send</p>
        </div>
      )}

      {/* Image send modal */}
      <ChatImageSendModal
        file={pendingImageFile}
        open={imageModalOpen}
        onOpenChange={(open) => {
          setImageModalOpen(open)
          if (!open) setPendingImageFile(null)
        }}
        onSend={handleSendImage}
        replyingTo={replyingToMessage}
      />
      <ChatFileSendModal
        file={pendingFileFile}
        open={fileModalOpen}
        onOpenChange={(open) => {
          setFileModalOpen(open)
          if (!open) setPendingFileFile(null)
        }}
        onSend={handleSendFile}
        replyingTo={replyingToMessage}
      />

      {/* Chat Header */}
      <div className="flex items-center justify-between border-b pr-3 bg-background">
        <div className="flex items-center min-w-0">
          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden ml-1 shrink-0"
            onClick={() => router.push('/chat')}
            aria-label="Back to chats"
          >
            <ArrowLeft className="size-4" />
          </Button>
          {room?.type === 'GROUP' ? (
            <ChatHeader
              mode="group"
              groupName={room.name}
              groupImage={room.imageUrl}
              participants={room.participants}
              presenceMap={presence}
              isEncrypted={isEncrypted}
              unreadCount={unreadCount}
            />
          ) : (
            <ChatHeader
              mode="dm"
              user={headerUser}
              presence={headerPresence}
              isEncrypted={isEncrypted}
              unreadCount={unreadCount}
            />
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setCreateGroupOpen(true)}
            aria-label={room?.type === 'GROUP' ? 'Invite members' : 'Create group chat'}
            title={room?.type === 'GROUP' ? 'Invite members' : 'Create group chat'}
          >
            {room?.type === 'GROUP' ? (
              <UserPlus className="size-4" strokeWidth={1.5} />
            ) : (
              <UsersRound className="size-4" strokeWidth={1.5} />
            )}
          </Button>
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
      </div>

      <GroupChatDialog
        key={createGroupOpen ? 'open' : 'closed'}
        open={createGroupOpen}
        onOpenChange={setCreateGroupOpen}
        mode={room?.type === 'GROUP' ? 'invite' : 'create'}
        roomId={room?.id}
        existingMemberIds={
          room?.type === 'GROUP' ? (room.participants?.map((p) => p.userId) ?? []) : []
        }
        defaultName={room?.type !== 'GROUP' && headerUser?.name ? `${headerUser.name}'s Group` : ''}
        defaultParticipantIds={
          room?.type !== 'GROUP' && otherParticipant?.userId ? [otherParticipant.userId] : []
        }
      />

      {/* Disconnected banner */}
      {showDisconnected && (
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-xs">
          <WifiOff className="size-3 shrink-0" />
          <span>Reconnecting… Messages may be delayed.</span>
        </div>
      )}

      {/* Unencrypted banner */}
      {room && !isEncrypted && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs">
          <LockKeyholeOpen className="size-3 shrink-0" />
          <span>Messages in this chat are not end-to-end encrypted.</span>
        </div>
      )}

      {/* Body: messages + optional info pane */}
      <div className="flex flex-1 overflow-hidden">
        {/* Messages Area */}
        <div className="flex flex-col flex-1 overflow-hidden relative">
          {/* Scrollable messages + blur overlay share this relative wrapper */}
          <div className="relative flex-1 overflow-hidden min-h-0 flex flex-col">
            {effectiveMessagesLoading && !keyLoadError ? (
              <ChatMessagesSkeleton />
            ) : (
              <ScrollArea
                ref={setScrollContainer}
                className="flex-1 min-h-0 p-4 [&>[data-radix-scroll-area-viewport]>div]:block!"
              >
                <div className="w-full">
                  <div ref={messagesContainerRef} className="flex flex-col gap-4 w-full my-1">
                    {/* Load more trigger (at top for loading older messages) */}
                    {hasNextPage && (
                      <div ref={loadMoreRef} className="flex justify-center py-2">
                        {isFetchingNextPage && (
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    )}

                    {/* Conversation Start Header */}
                    {!hasNextPage && (
                      <ChatConversationStart
                        room={room}
                        currentUserId={user?.id}
                        messageCount={messages.length}
                      />
                    )}

                    <AnimatePresence initial={false}>
                      {messages.map((msg, i) => {
                        const isMe = msg.userId === user?.id
                        const showAvatar = i === 0 || messages[i - 1].userId !== msg.userId
                        const showDateSeparator = shouldShowDateSeparator(msg, messages[i - 1])
                        const isDeleting = deletingIds.has(msg.id)
                        const isTemp = msg.id.startsWith('temp-')

                        return (
                          <motion.div
                            key={msg.id || i}
                            data-message-id={msg.id}
                            initial={isTemp ? { opacity: 0, scale: 0.97, y: 8 } : false}
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
                            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                          >
                            {/* Date Separator */}
                            {showDateSeparator && (
                              <div className="flex items-center justify-center my-4">
                                <div className="px-2.5 py-0.5 bg-secondary border border-border rounded-full text-[0.625rem] text-secondary-foreground font-medium">
                                  {getDateSeparatorText(new Date(msg.createdAt))}
                                </div>
                              </div>
                            )}

                            {/* Unread divider */}
                            {firstUnreadId === msg.id && !isMe && (
                              <div className="flex items-center gap-3 my-3">
                                <div className="flex-1 h-px bg-primary/25" />
                                <span className="text-[0.5625rem] font-bold font-mono tracking-widest uppercase text-primary bg-primary/10 px-2.5 py-1 rounded-full whitespace-nowrap">
                                  ↓ new messages
                                </span>
                                <div className="flex-1 h-px bg-primary/25" />
                              </div>
                            )}

                            {/* Message Bubble */}
                            {msg.type === 'SYSTEM' ? (
                              <div className="flex justify-center my-1">
                                <span className="text-[0.5625rem] font-bold tracking-widest uppercase text-primary bg-primary/10 px-2.5 py-1 rounded-full whitespace-nowrap">
                                  {msg.content}
                                </span>
                              </div>
                            ) : (
                              <ChatMessageBubble
                                message={msg}
                                isMe={isMe}
                                showAvatar={showAvatar}
                                currentUserId={user?.id}
                                isHighlighted={highlightedMessageId === msg.id}
                                isGroup={room.type === 'GROUP'}
                                participants={room.participants}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                onReply={handleReply}
                                onScrollToMessage={handleScrollToMessage}
                              />
                            )}
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
                          return (
                            <TypingIndicator key={typingUser.userId} participant={participant} />
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            )}

            {/* Scroll to bottom / typing indicator FAB */}
            {!isAtBottom && (
              <div className="absolute bottom-20 left-0 right-0 z-30 flex justify-center pointer-events-none">
                <button
                  className={cn(
                    'pointer-events-auto h-8 shadow-md bg-background/95 border border-border hover:bg-accent hover:text-accent-foreground flex items-center justify-center transition-all',
                    roomTypingUsers.length > 0 ? 'rounded-full px-3 gap-1' : 'w-8 rounded-full',
                  )}
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

            {/* Error overlay — key found but failed to decrypt (wrong device / key mismatch) */}
            {keyLoadError && (
              <div className="absolute inset-0 z-40 flex items-center justify-center backdrop-blur-md bg-background/60">
                <div className="flex flex-col items-center gap-4 rounded-2xl border bg-card p-8 shadow-xl max-w-xs text-center mx-4">
                  <div className="rounded-full bg-destructive/10 p-4">
                    <KeyRound className="size-7 text-destructive" />
                  </div>
                  <div className="space-y-1.5">
                    <p className="font-semibold text-sm">Couldn&apos;t load encryption key</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Your key was found but couldn&apos;t decrypt this room. It may be from a
                      different account setup.
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={handleRetryLoadKey}>
                    <RefreshCw className="size-3.5 mr-1.5" />
                    Retry
                  </Button>
                </div>
              </div>
            )}

            {/* Blur overlay — encrypted room, no local private key */}
            {isEncrypted && !hasPrivateKey && (
              <div className="absolute inset-0 z-40 flex items-center justify-center backdrop-blur-md bg-background/60">
                <div className="flex flex-col items-center gap-4 rounded-2xl border bg-card p-8 shadow-xl max-w-xs text-center mx-4">
                  <div className="rounded-full bg-primary/10 p-4">
                    <KeyRound className="size-7 text-primary" />
                  </div>
                  <div className="space-y-1.5">
                    <p className="font-semibold text-sm">Messages are end-to-end encrypted</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Your decryption key isn&apos;t on this device. Import it from a device where
                      you&apos;ve already set up this account.
                    </p>
                  </div>
                  <Button size="sm" onClick={() => setImportKeysOpen(true)}>
                    <ScanLine className="size-3.5 mr-1.5" />
                    Import key
                  </Button>
                </div>
              </div>
            )}
          </div>

          <ChatInput
            value={content}
            onChange={setContent}
            onSend={handleSend}
            onImageSelect={openImageModal}
            onFileSelect={openFileModal}
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
      <ImportKeysDialog
        open={importKeysOpen}
        onOpenChange={setImportKeysOpen}
        userPublicKey={user?.publicKey ?? ''}
      />
    </div>
  )
}
