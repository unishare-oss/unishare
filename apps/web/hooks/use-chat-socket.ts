'use client'

import { useContext } from 'react'
import { ChatSocketContext } from '@/contexts/chat-socket-context'

export function useChatSocket() {
  const context = useContext(ChatSocketContext)
  if (!context) {
    throw new Error('useChatSocket must be used within ChatSocketProvider')
  }
  return context
}
