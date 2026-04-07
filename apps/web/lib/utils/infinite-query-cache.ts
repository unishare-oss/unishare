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
    pages: oldData.pages.map((page: any) => {
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

/**
 * Updates a message in the infinite query cache
 */
export function updateMessageInInfiniteCache(
  oldData: any,
  messageId: string,
  updatedMessage: ChatMessageEntity,
): any {
  if (!oldData?.pages) return oldData

  return {
    ...oldData,
    pages: oldData.pages.map((page: any) => {
      return {
        ...page,
        data: {
          ...page.data,
          items: page.data.items.map((item: any) => {
            if (item.id === messageId) {
              return updatedMessage
            }
            return item
          }),
        },
      }
    }),
  }
}

/**
 * Removes a deleted message from the infinite query cache
 * Updates parent references in child messages before removal
 */
export function deleteMessageFromInfiniteCache(oldData: any, messageId: string): any {
  if (!oldData?.pages) return oldData

  return {
    ...oldData,
    pages: oldData.pages.map((page: any) => {
      return {
        ...page,
        data: {
          ...page.data,
          items: page.data.items
            .map((item: ChatMessageEntity) => {
              // Update parent reference if it was the deleted message
              if (item.parent?.id === messageId) {
                return {
                  ...item,
                  parent: {
                    ...item.parent,
                    content: null,
                  },
                }
              }
              return item
            })
            .filter((item: ChatMessageEntity) => item.id !== messageId), // Remove the deleted message
        },
      }
    }),
  }
}
