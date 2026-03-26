'use client'

import { useEffect, useRef, useState } from 'react'
import {
  useChatControllerGetMessages,
  useChatControllerSendMessage,
} from '@/src/lib/api/generated/chat/chat'
import { useAuth } from '@/contexts/auth-context'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Hash, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ChatInput } from './chat-input'

interface ChatWindowProps {
  roomId: string
  lastSocketMessage?: any
}

export function ChatWindow({ roomId, lastSocketMessage }: ChatWindowProps) {
  const { user } = useAuth()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [content, setContent] = useState('')
  const [messages, setMessages] = useState<any[]>([])

  const { data: initialMessages, isLoading } = useChatControllerGetMessages(roomId, {
    limit: 50,
    direction: 'asc',
  })

  const { mutate: sendMessage, isPending: isSending } = useChatControllerSendMessage()

  // Load initial messages
  useEffect(() => {
    if (initialMessages?.data?.items) {
      setMessages(initialMessages.data.items)
    }
  }, [initialMessages])

  // Handle real-time messages
  useEffect(() => {
    if (lastSocketMessage && lastSocketMessage.roomId === roomId) {
      setMessages((prev) => {
        // Prevent duplicate messages if REST call also returns the new message
        if (prev.find((m) => m.id === lastSocketMessage.id)) return prev
        return [...prev, lastSocketMessage]
      })
    }
  }, [lastSocketMessage, roomId])

  // Auto-scroll to bottom
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
      <div className="h-14 border-b flex items-center px-4 bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Hash className="h-5 w-5 text-muted-foreground" />
          <span className="font-semibold text-sm tracking-tight">Chat Room</span>
        </div>
      </div>

      {/* Messages Area */}
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
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
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

      <ChatInput value={content} onChange={setContent} onSend={handleSend} isLoading={isSending} />
    </div>
  )
}
