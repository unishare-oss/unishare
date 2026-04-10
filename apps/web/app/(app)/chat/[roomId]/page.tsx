'use client'

import { use, useEffect } from 'react'
import { UnifiedChatWindow } from '@/components/chat/unified-chat-window'
import { ChatPageTransition } from '@/components/chat/chat-page-transition'
import { useChatSocket } from '@/hooks/use-chat-socket'

export default function ChatRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params)
  const { joinRoom } = useChatSocket()

  useEffect(() => {
    if (roomId) {
      joinRoom(roomId)
    }
  }, [roomId, joinRoom])

  return (
    <ChatPageTransition direction="forward">
      <UnifiedChatWindow roomId={roomId} key={roomId} />
    </ChatPageTransition>
  )
}
