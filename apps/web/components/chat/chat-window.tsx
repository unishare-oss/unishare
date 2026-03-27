'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  useChatControllerGetMessages,
  useChatControllerGetRoom,
  useChatControllerSendMessage,
} from '@/src/lib/api/generated/chat/chat'
import type {
  ChatMessageEntity,
  ChatRoomParticipantEntity,
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

interface ChatWindowProps {
  roomId: string
  lastSocketMessage?: any
}

export function ChatWindow({ roomId, lastSocketMessage }: ChatWindowProps) {
  const { user } = useAuth()
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [content, setContent] = useState('')
  const [socketMessages, setSocketMessages] = useState<ChatMessageEntity[]>([])
  const [infoPaneOpen, setInfoPaneOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const { data: roomResponse } = useChatControllerGetRoom(roomId)
  const room = roomResponse?.data

  const otherParticipant = room?.participants?.find(
    (p: ChatRoomParticipantEntity) => p.userId !== user?.id,
  )
  const targetUser = otherParticipant?.user

  const headerUser = targetUser
    ? {
        ...targetUser,
        isActive: false,
        lastSeenAt: undefined,
      }
    : undefined

  const { data: initialMessages, isLoading } = useChatControllerGetMessages(roomId, {
    limit: 50,
    direction: 'asc',
  })

  const { mutate: sendMessage, isPending: isSending } = useChatControllerSendMessage()

  const initialMsgs = useMemo(() => initialMessages?.data?.items ?? [], [initialMessages])

  const messages = useMemo(() => {
    const socketIds = new Set(socketMessages.map((m) => m.id))
    const merged = [...initialMsgs.filter((m) => !socketIds.has(m.id)), ...socketMessages]
    if (!searchQuery.trim()) return merged
    const q = searchQuery.toLowerCase()
    return merged.filter((m) => m.content && (m.content as string).toLowerCase().includes(q))
  }, [initialMsgs, socketMessages, searchQuery])

  useEffect(() => {
    if (lastSocketMessage && lastSocketMessage.roomId === roomId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSocketMessages((prev) => {
        if (prev.find((m) => m.id === lastSocketMessage.id)) return prev
        return [...prev, lastSocketMessage]
      })
    }
  }, [lastSocketMessage, roomId])

  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages])

  const handleSend = () => {
    if (!content.trim()) return
    sendMessage({ id: roomId, data: { content, type: 'TEXT' } })
    setContent('')
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

      {/* Body: messages + optional info pane */}
      <div className="flex flex-1 overflow-hidden pb-16 md:pb-0">
        {/* Messages Area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {isLoading ? (
            <ChatMessagesSkeleton />
          ) : (
            <ScrollArea ref={scrollRef} className="flex-1 min-h-0 p-4">
              <div className="flex flex-col gap-4 max-w-6xl mx-auto">
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
            isLoading={isSending}
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
            room={room}
            messages={messages}
            currentUserId={user?.id}
            isOpen={infoPaneOpen}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>
      </div>
    </div>
  )
}
