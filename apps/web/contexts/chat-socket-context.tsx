'use client'

import {
  createContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
  RefObject,
} from 'react'
import { io, Socket } from 'socket.io-client'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth-context'
import { ChatMessageEntity } from '@/src/lib/api/generated/unishareAPI.schemas'
import { useQueryClient } from '@tanstack/react-query'
import {
  getChatControllerGetRoomsQueryKey,
  getChatControllerGetMessagesInfiniteQueryKey,
  getChatControllerGetRoomQueryKey,
} from '@/src/lib/api/generated/chat/chat'
import {
  addMessageToInfiniteCache,
  deleteMessageFromInfiniteCache,
  updateMessageInInfiniteCache,
} from '@/lib/utils/infinite-query-cache'

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export interface PresenceEntry {
  status: 0 | 1
  lastSeen?: number
}

export interface ChatSocketContextValue {
  socketRef: RefObject<Socket | null>
  isConnected: boolean
  lastMessage: ChatMessageEntity | null
  joinRoom: (roomId: string) => void
  presence: Map<string, PresenceEntry>
}

export const ChatSocketContext = createContext<ChatSocketContextValue | null>(null)

export function ChatSocketProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<ChatMessageEntity | null>(null)
  const [presence, setPresence] = useState<Map<string, PresenceEntry>>(new Map())

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
      if (message.userId && message.userId === session.user.id) {
        return
      }
      setLastMessage(message)

      // Update messages cache
      const queryKey = getChatControllerGetMessagesInfiniteQueryKey(message.roomId, {
        limit: 50,
        direction: 'desc',
      })
      queryClient.setQueryData(queryKey, (old: any) => addMessageToInfiniteCache(old, message))

      // Update rooms list preview
      queryClient.setQueryData(getChatControllerGetRoomsQueryKey(), (old: any) => {
        if (!old?.data) return old
        return {
          ...old,
          data: old.data.map((room: any) => {
            if (room.id === message.roomId) {
              return {
                ...room,
                updatedAt: message.createdAt,
                messages: [message],
              }
            }
            return room
          }),
        }
      })
    })

    socket.on('message-updated', (message: any) => {
      if (message.userId === session.user.id) {
        return
      }

      const queryKey = getChatControllerGetMessagesInfiniteQueryKey(message.roomId, {
        limit: 50,
        direction: 'desc',
      })
      queryClient.setQueryData(queryKey, (old: any) =>
        updateMessageInInfiniteCache(old, message.id, message),
      )

      // Update rooms list preview if it's the last message
      queryClient.setQueryData(getChatControllerGetRoomsQueryKey(), (old: any) => {
        if (!old?.data) return old
        return {
          ...old,
          data: old.data.map((room: any) => {
            if (room.id === message.roomId && room.messages?.[0]?.id === message.id) {
              return {
                ...room,
                messages: [message],
              }
            }
            return room
          }),
        }
      })
    })

    socket.on('message-deleted', (payload: { roomId: string; messageId: string }) => {
      const queryKey = getChatControllerGetMessagesInfiniteQueryKey(payload.roomId, {
        limit: 50,
        direction: 'desc',
      })
      queryClient.setQueryData(queryKey, (old: any) =>
        deleteMessageFromInfiniteCache(old, payload.messageId),
      )

      // If deleted message was the preview message, invalidate rooms to get the next one
      queryClient.setQueryData(getChatControllerGetRoomsQueryKey(), (old: any) => {
        if (!old?.data) return old
        const room = old.data.find((r: any) => r.id === payload.roomId)
        if (room?.messages?.[0]?.id === payload.messageId) {
          queryClient.invalidateQueries({ queryKey: getChatControllerGetRoomsQueryKey() })
        }
        return old
      })
    })

    socket.on('room-read', (payload: { roomId: string; userId: string; lastReadAt: string }) => {
      const { roomId, userId, lastReadAt } = payload

      // Update the individual room cache so delivery ticks re-compute
      queryClient.setQueryData(getChatControllerGetRoomQueryKey(roomId), (old: any) => {
        if (!old?.data) return old
        return {
          ...old,
          data: {
            ...old.data,
            participants: old.data.participants.map((p: any) =>
              p.userId === userId ? { ...p, lastReadAt } : p,
            ),
          },
        }
      })
    })

    socket.on('user-presence', (payload: { userId: string; status: 0 | 1; lastSeen?: number }) => {
      setPresence((prev) => {
        const next = new Map(prev)
        next.set(payload.userId, { status: payload.status, lastSeen: payload.lastSeen })
        return next
      })
    })

    socket.on('error', (error: any) => {
      console.error('Chat socket error:', error)
      const message = typeof error === 'string' ? error : error.message || 'Chat connection error'
      toast.error(message)
    })

    return () => {
      socket.disconnect()
    }
  }, [session, queryClient])

  const joinRoom = (roomId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('join-room', roomId)
    }
  }

  const value: ChatSocketContextValue = {
    socketRef,
    isConnected,
    lastMessage,
    joinRoom,
    presence,
  }

  return <ChatSocketContext.Provider value={value}>{children}</ChatSocketContext.Provider>
}
