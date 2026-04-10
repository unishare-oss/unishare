'use client'

import { useRef, useState, useEffect, RefObject } from 'react'
import { useScrollPositionRestore } from './use-scroll-position-restore'
import { useChatLastSeenStore } from '@/lib/store'
import type { ChatMessageEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

interface UseScrollManagerParams {
  roomId: string | undefined
  messages: ChatMessageEntity[]
  messagesLoading: boolean
  isFetchingNextPage: boolean
  roomTypingUsersCount: number
  messagesContainerRef: RefObject<HTMLDivElement | null>
  setFirstUnreadId: (id: string | null) => void
}

export function useScrollManager({
  roomId,
  messages,
  messagesLoading,
  isFetchingNextPage,
  roomTypingUsersCount,
  messagesContainerRef,
  setFirstUnreadId,
}: UseScrollManagerParams) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const hasScrolledInitiallyRef = useRef(false)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const { getLastSeen } = useChatLastSeenStore()

  const { prepareForLoad, isLoadingMore } = useScrollPositionRestore({
    scrollRef: scrollContainerRef,
    isFetchingNextPage,
  })

  const setScrollContainer = (node: HTMLDivElement | null) => {
    if (node) {
      const el = node.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement
      scrollContainerRef.current = el
      if (el) {
        const handleScroll = () => {
          const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
          setIsAtBottom(distFromBottom < 100)
        }
        el.addEventListener('scroll', handleScroll, { passive: true })
      }
    }
  }

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior,
      })
    }
  }

  // Reset scroll state on room change
  useEffect(() => {
    hasScrolledInitiallyRef.current = false
  }, [roomId])

  // Scroll to first unread or bottom on initial load
  useEffect(() => {
    if (
      !scrollContainerRef.current ||
      messagesLoading ||
      messages.length === 0 ||
      hasScrolledInitiallyRef.current ||
      !roomId
    )
      return

    const lastSeenId = getLastSeen(roomId)

    if (lastSeenId) {
      const idx = messages.findIndex((m) => m.id === lastSeenId)
      const unreadMsg = idx === -1 ? messages[0] : (messages[idx + 1] ?? null)

      if (unreadMsg) {
        setTimeout(() => setFirstUnreadId(unreadMsg.id), 0)
        const el = messagesContainerRef.current?.querySelector(
          `[data-message-id="${unreadMsg.id}"]`,
        ) as HTMLElement | null
        if (el) {
          el.scrollIntoView({ block: 'center' })
        } else {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
        }
        hasScrolledInitiallyRef.current = true
        return
      }
    }

    scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    hasScrolledInitiallyRef.current = true
  }, [messagesLoading, messages.length, roomId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll when new messages or typing indicator appears
  useEffect(() => {
    if (!scrollContainerRef.current || isLoadingMore.current || !hasScrolledInitiallyRef.current)
      return
    const el = scrollContainerRef.current
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distFromBottom < 150) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages.length, roomTypingUsersCount]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    scrollContainerRef,
    setScrollContainer,
    isAtBottom,
    scrollToBottom,
    isLoadingMore,
    prepareForLoad,
  }
}
