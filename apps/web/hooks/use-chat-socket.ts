'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { toast } from 'sonner'
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
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
    })

    socket.on('connect_error', () => {
      setIsConnected(false)
    })

    socket.on('receive-message', (message: any) => {
      setLastMessage(message)
    })

    socket.on('error', (error: any) => {
      console.error('Chat socket error:', error)
      toast.error('Chat connection error. Messages may not be delivered.')
    })

    return () => {
      socket.disconnect()
    }
  }, [session])

  const joinRoom = (roomId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('join-room', roomId)
    }
  }

  return {
    socket: socketRef.current,
    isConnected,
    lastMessage,
    joinRoom,
  }
}
