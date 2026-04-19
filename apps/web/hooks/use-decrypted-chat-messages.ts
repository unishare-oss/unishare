'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useChatControllerGetMessagesInfinite } from '@/src/lib/api/generated/chat/chat'
import type { ChatMessageEntity } from '@/src/lib/api/generated/unishareAPI.schemas'
import { useCrypto } from './use-crypto'

interface UseDecryptedChatMessagesResult {
  messages: ChatMessageEntity[]
  isLoading: boolean
  isFetchingNextPage: boolean
  hasNextPage: boolean
  fetchNextPage: () => Promise<unknown>
}

export function useDecryptedChatMessages(
  roomId: string | undefined,
): UseDecryptedChatMessagesResult {
  const { decrypt, hasRoomKey } = useCrypto()

  const {
    data,
    isLoading: queryLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useChatControllerGetMessagesInfinite(
    roomId || '',
    { limit: 50, direction: 'desc' },
    {
      query: {
        enabled: !!roomId,
        getNextPageParam: (lastPage) =>
          lastPage.data.hasMore ? lastPage.data.nextCursor : undefined,
      },
    },
  )

  const rawMessages = useMemo<ChatMessageEntity[]>(() => {
    if (!data?.pages) return []
    return data.pages.flatMap((page) => page.data.items).reverse()
  }, [data])

  const contentCacheRef = useRef<Map<string, string>>(new Map())
  const parentCacheRef = useRef<Map<string, string>>(new Map())

  useEffect(() => {
    contentCacheRef.current = new Map()
    parentCacheRef.current = new Map()
  }, [roomId])

  const [decryptedMessages, setDecryptedMessages] = useState<ChatMessageEntity[]>([])
  const generationRef = useRef(0)

  useEffect(() => {
    if (!roomId || rawMessages.length === 0) {
      setDecryptedMessages([])
      return
    }
    if (!hasRoomKey(roomId)) return

    const generation = ++generationRef.current

    const run = async () => {
      const contentCache = contentCacheRef.current
      const parentCache = parentCacheRef.current

      await Promise.all(
        rawMessages.map(async (msg) => {
          if (msg.content && msg.type === 'TEXT' && !contentCache.has(msg.id)) {
            try {
              contentCache.set(msg.id, await decrypt(roomId, msg.content))
            } catch {
              contentCache.set(msg.id, msg.content)
            }
          }
          if (
            msg.parent?.id &&
            msg.parent.content &&
            msg.parent.type === 'TEXT' &&
            !parentCache.has(msg.parent.id)
          ) {
            try {
              parentCache.set(msg.parent.id, await decrypt(roomId, msg.parent.content))
            } catch {
              parentCache.set(msg.parent.id, msg.parent.content)
            }
          }
        }),
      )

      if (generation !== generationRef.current) return

      const mapped = rawMessages.map((msg) => {
        const content = msg.content && msg.type === 'TEXT' ? contentCache.get(msg.id) : msg.content
        const parent =
          msg.parent?.id && msg.parent.content && msg.parent.type === 'TEXT'
            ? { ...msg.parent, content: parentCache.get(msg.parent.id)! }
            : msg.parent
        return { ...msg, content, parent }
      })

      setDecryptedMessages(mapped)
    }

    run()
  }, [rawMessages, roomId, decrypt, hasRoomKey])

  const hasRawData = rawMessages.length > 0
  const isLoading = queryLoading || (hasRawData && decryptedMessages.length === 0)
  const isFetchingNextPageCombined =
    isFetchingNextPage || (hasRawData && rawMessages.length > decryptedMessages.length)

  return {
    messages: decryptedMessages,
    isLoading,
    isFetchingNextPage: isFetchingNextPageCombined,
    hasNextPage: !!hasNextPage,
    fetchNextPage,
  }
}
