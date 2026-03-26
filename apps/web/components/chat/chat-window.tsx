'use client'

import { useEffect, useRef, useState } from 'react'
import {
  useChatControllerGetMessages,
  useChatControllerGetRoom,
  useChatControllerSendMessage,
} from '@/src/lib/api/generated/chat/chat'
import { useAuth } from '@/contexts/auth-context'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2, PanelRightOpen, PanelRightClose } from 'lucide-react'
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
  const scrollRef = useRef<HTMLDivElement>(null)
  const [content, setContent] = useState('')
  const [messages, setMessages] = useState<any[]>([])
  const [infoPaneOpen, setInfoPaneOpen] = useState(false)

  const { data: roomResponse } = useChatControllerGetRoom(roomId)
  const room = roomResponse?.data

  const otherParticipant = room?.participants?.find((p: any) => p.userId !== user?.id)
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

  useEffect(() => {
    if (initialMessages?.data?.items) {
      setMessages(initialMessages.data.items)
    }
  }, [initialMessages])

  useEffect(() => {
    if (lastSocketMessage && lastSocketMessage.roomId === roomId) {
      setMessages((prev) => {
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

  if (isLoading) {
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
        <ChatHeader user={headerUser} />
        <button
          onClick={() => setInfoPaneOpen((v) => !v)}
          className="p-1.5 rounded-[6px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          aria-label="Toggle info pane"
        >
          {infoPaneOpen ? (
            <PanelRightClose className="size-4" strokeWidth={1.5} />
          ) : (
            <PanelRightOpen className="size-4" strokeWidth={1.5} />
          )}
        </button>
      </div>

      {/* Body: messages + optional info pane */}
      <div className="flex flex-1 overflow-hidden">
        {/* Messages Area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <ScrollArea ref={scrollRef} className="flex-1 p-4">
            <div className="flex flex-col gap-4 max-w-4xl mx-auto">
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
            'border-l bg-background/95 overflow-hidden transition-all duration-300 ease-in-out flex-shrink-0',
            infoPaneOpen ? 'w-64' : 'w-0',
          )}
        >
          <ChatInfoPane room={room} messages={messages} currentUserId={user?.id} />
        </div>
      </div>
    </div>
  )
}
