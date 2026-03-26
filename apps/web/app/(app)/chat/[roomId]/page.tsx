'use client'

import { use } from 'react'
import { ChatWindow } from '@/components/chat/chat-window'
import { ChatPageTransition } from '@/components/chat/chat-page-transition'
import { useChatSocket } from '@/hooks/use-chat-socket'
import { useEffect } from 'react'

export default function ChatRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params)
  const { joinRoom, lastMessage } = useChatSocket()

  useEffect(() => {
    if (roomId) {
      joinRoom(roomId)
    }
  }, [roomId, joinRoom])

  return (
    <ChatPageTransition direction="forward">
      <ChatWindow roomId={roomId} key={roomId} lastSocketMessage={lastMessage} />
    </ChatPageTransition>
  )
}
