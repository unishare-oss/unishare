'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from '@/contexts/auth-context'
import { ChatMessageEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export function useChatSocket() {
  const { session } = useAuth()
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<ChatMessageEntity | null>(null)

  useEffect(() => {
    if (!session) return

    const socket = io(`${SOCKET_URL}/chat`, {
      withCredentials: true,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setIsConnected(true)
      console.log('Chat socket connected')
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
      console.log('Chat socket disconnected')
    })

    socket.on('receive-message', (message: any) => {
      setLastMessage(message)
    })

    socket.on('error', (error: any) => {
      console.error('Chat socket error:', error)
    })

    return () => {
      socket.disconnect()
    }
  }, [session])

  const joinRoom = useCallback((roomId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('join-room', roomId)
    }
  }, [])

  return {
    isConnected,
    lastMessage,
    joinRoom,
  }
}
