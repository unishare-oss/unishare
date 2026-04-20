'use client'

import { startTransition, useEffect, useMemo, useRef, useState } from 'react'
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
  isEncrypted?: boolean,
): UseDecryptedChatMessagesResult {
  const { decrypt, hasRoomKey, roomKeyVersion } = useCrypto()

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

  const contentCacheRef = useRef<Map<string, { encrypted: string; decrypted: string }>>(new Map())
  const parentCacheRef = useRef<Map<string, { encrypted: string; decrypted: string }>>(new Map())

  useEffect(() => {
    contentCacheRef.current = new Map()
    parentCacheRef.current = new Map()
  }, [roomId])

  const [decryptedMessages, setDecryptedMessages] = useState<ChatMessageEntity[]>([])
  const generationRef = useRef(0)

  useEffect(() => {
    if (!roomId || rawMessages.length === 0) {
      startTransition(() => setDecryptedMessages([]))
      return
    }

    // Unencrypted room — show messages as-is without decryption
    if (isEncrypted === false) {
      startTransition(() => setDecryptedMessages(rawMessages))
      return
    }

    if (!hasRoomKey(roomId)) return

    const generation = ++generationRef.current

    const run = async () => {
      const contentCache = contentCacheRef.current
      const parentCache = parentCacheRef.current

      await Promise.all(
        rawMessages.map(async (msg) => {
          if (
            msg.content &&
            (msg.type === 'TEXT' || msg.type === 'LINK') &&
            contentCache.get(msg.id)?.encrypted !== msg.content
          ) {
            try {
              contentCache.set(msg.id, {
                encrypted: msg.content,
                decrypted: await decrypt(roomId, msg.content),
              })
            } catch {
              contentCache.set(msg.id, { encrypted: msg.content, decrypted: msg.content })
            }
          }
          if (
            msg.parent?.id &&
            msg.parent.content &&
            (msg.parent.type === 'TEXT' || msg.parent.type === 'LINK') &&
            parentCache.get(msg.parent.id)?.encrypted !== msg.parent.content
          ) {
            try {
              parentCache.set(msg.parent.id, {
                encrypted: msg.parent.content,
                decrypted: await decrypt(roomId, msg.parent.content),
              })
            } catch {
              parentCache.set(msg.parent.id, {
                encrypted: msg.parent.content,
                decrypted: msg.parent.content,
              })
            }
          }
        }),
      )

      if (generation !== generationRef.current) return

      const mapped = rawMessages.map((msg) => {
        const content =
          msg.content && (msg.type === 'TEXT' || msg.type === 'LINK')
            ? contentCache.get(msg.id)?.decrypted
            : msg.content
        const parent =
          msg.parent?.id &&
          msg.parent.content &&
          (msg.parent.type === 'TEXT' || msg.parent.type === 'LINK')
            ? { ...msg.parent, content: parentCache.get(msg.parent.id)!.decrypted }
            : msg.parent
        return { ...msg, content, parent }
      })

      setDecryptedMessages(mapped)
    }

    run()
  }, [rawMessages, roomId, decrypt, hasRoomKey, roomKeyVersion, isEncrypted])

  const hasRawData = rawMessages.length > 0
  const isLoading =
    queryLoading || (hasRawData && isEncrypted !== false && decryptedMessages.length === 0)
  const isFetchingNextPageCombined =
    isFetchingNextPage ||
    (hasRawData && isEncrypted !== false && rawMessages.length > decryptedMessages.length)

  return {
    messages: decryptedMessages,
    isLoading,
    isFetchingNextPage: isFetchingNextPageCombined,
    hasNextPage: !!hasNextPage,
    fetchNextPage,
  }
}
