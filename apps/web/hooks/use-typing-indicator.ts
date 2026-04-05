'use client'

import { useRef, useEffect, useState, useMemo } from 'react'
import { Socket } from 'socket.io-client'

interface TypingUser {
  userId: string
  roomId: string
}

const DEBOUNCE_DELAY_MS = 300
const INACTIVITY_TIMEOUT_MS = 5000

/**
 * Global typing indicator hook - tracks typing status across ALL rooms
 * Can be used in chat window for specific room or in sidebar for all rooms
 */
export function useGlobalTypingIndicator(socket: Socket | null, currentUserId?: string) {
  const typingUsersRef = useRef<Map<string, TypingUser>>(new Map())
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])

  // Listen for incoming typing events from ALL rooms
  useEffect(() => {
    if (!socket || !currentUserId) return

    const typingTimeouts = new Map<string, NodeJS.Timeout>()

    const handleUserTyping = (data: { userId: string; roomId: string; isTyping: boolean }) => {
      // Ignore self
      if (data.userId === currentUserId) return

      const key = `${data.userId}-${data.roomId}`

      if (data.isTyping) {
        typingUsersRef.current.set(key, {
          userId: data.userId,
          roomId: data.roomId,
        })

        // Clear existing timeout for this user
        const existingTimeout = typingTimeouts.get(key)
        if (existingTimeout) clearTimeout(existingTimeout)

        // Set timeout to auto-clear typing after 5s
        const timeout = setTimeout(() => {
          typingUsersRef.current.delete(key)
          typingTimeouts.delete(key)
          setTypingUsers(Array.from(typingUsersRef.current.values()))
        }, INACTIVITY_TIMEOUT_MS)

        typingTimeouts.set(key, timeout)
      } else {
        typingUsersRef.current.delete(key)
        const timeout = typingTimeouts.get(key)
        if (timeout) clearTimeout(timeout)
        typingTimeouts.delete(key)
      }

      setTypingUsers(Array.from(typingUsersRef.current.values()))
    }

    socket.on('user-typing', handleUserTyping)

    return () => {
      socket.off('user-typing', handleUserTyping)
      // Cleanup all timeouts
      typingTimeouts.forEach((timeout) => clearTimeout(timeout))
      typingTimeouts.clear()
    }
  }, [socket, currentUserId])

  // Build a Map of roomId -> TypingUser[] for easy lookup
  const typingByRoom = useMemo(() => {
    const map = new Map<string, TypingUser[]>()
    typingUsers.forEach((user) => {
      const existing = map.get(user.roomId) || []
      map.set(user.roomId, [...existing, user])
    })
    return map
  }, [typingUsers])

  return {
    typingUsers, // All typing users across all rooms
    typingByRoom, // Map<roomId, TypingUser[]> for easy lookup
  }
}

/**
 * Hook for emitting typing events in a specific room
 * Use alongside useGlobalTypingIndicator
 */
export function useEmitTyping(socket: Socket | null, roomId: string, message: string) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!socket || !roomId) return

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      socket.emit('typing', { roomId, isTyping: !!message })
    }, DEBOUNCE_DELAY_MS)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [message, socket, roomId])
}
