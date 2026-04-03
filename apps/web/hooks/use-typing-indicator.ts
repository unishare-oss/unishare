'use client'

import { useRef, useEffect, useState } from 'react'
import { Socket } from 'socket.io-client'

interface TypingUser {
  userId: string
  roomId: string
}

const DEBOUNCE_DELAY_MS = 300
const INACTIVITY_TIMEOUT_MS = 5000

export function useTypingIndicator(
  socket: Socket | null,
  roomId: string,
  userId: string,
  message: string,
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const typingUsersRef = useRef<Map<string, TypingUser>>(new Map())
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])

  // Listen for incoming typing events
  useEffect(() => {
    if (!socket) return

    const typingTimeouts = new Map<string, NodeJS.Timeout>()

    const handleUserTyping = (data: { userId: string; roomId: string; isTyping: boolean }) => {
      // Ignore self
      if (data.userId === userId) return

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
  }, [socket, userId])

  // Debounced typing effect
  useEffect(() => {
    if (!socket) return

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

  // Get typing users for current room
  const roomTypingUsers = typingUsers.filter((user) => user.roomId === roomId)

  return {
    roomTypingUsers,
    typingUsers,
  }
}
