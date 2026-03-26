'use client'

import { use } from 'react'
import { ChatWindow } from '@/components/chat/chat-window'
import { useChatSocket } from '@/hooks/use-chat-socket'
import { useEffect } from 'react'

export default function ChatRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params)
  const { joinRoom, lastMessage } = useChatSocket()

  // Join the socket room whenever the ID in the URL changes
  useEffect(() => {
    if (roomId) {
      joinRoom(roomId)
    }
  }, [roomId, joinRoom])

  return <ChatWindow roomId={roomId} key={roomId} lastSocketMessage={lastMessage} />
}
