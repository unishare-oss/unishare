import type { ChatMessageEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

/**
 * Adds a message to the first page of an infinite query cache
 * Used for optimistic updates and real-time socket messages
 */
export function addMessageToInfiniteCache(oldData: any, newMessage: ChatMessageEntity): any {
  if (!oldData?.pages) return oldData

  const firstPage = oldData.pages[0]
  if (!firstPage?.data?.items) return oldData

  // Check if message already exists
  const exists = firstPage.data.items.some((m: ChatMessageEntity) => m.id === newMessage.id)
  if (exists) return oldData

  // Add to the beginning of first page (newest messages)
  return {
    ...oldData,
    pages: [
      {
        ...firstPage,
        data: {
          ...firstPage.data,
          items: [newMessage, ...firstPage.data.items],
        },
      },
      ...oldData.pages.slice(1),
    ],
  }
}

/**
 * Replaces an optimistic message with the real message in infinite query cache
 */
export function replaceMessageInInfiniteCache(
  oldData: any,
  tempId: string,
  realMessage: ChatMessageEntity,
): any {
  if (!oldData?.pages) return oldData

  return {
    ...oldData,
    pages: oldData.pages.map((page: any, index: number) => {
      if (index !== 0) return page // Only update first page (newest)

      return {
        ...page,
        data: {
          ...page.data,
          items: page.data.items.map((item: any) => {
            // Replace ONLY the optimistic message
            if (item.id === tempId) {
              return realMessage
            }
            return item
          }),
        },
      }
    }),
  }
}
