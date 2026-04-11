import { useQueryClient } from '@tanstack/react-query'
import {
  useChatControllerSendMessage,
  useChatControllerCreateRoom,
  useChatControllerEditMessage,
  useChatControllerDeleteMessage,
  getChatControllerGetMessagesInfiniteQueryKey,
  getChatControllerGetRoomsQueryKey,
} from '@/src/lib/api/generated/chat/chat'
import type {
  ChatMessageEntity,
  ChatRoomEntity,
  UserProfileEntity,
  ChatMessageEntityType,
} from '@/src/lib/api/generated/unishareAPI.schemas'
import {
  addMessageToInfiniteCache,
  replaceMessageInInfiniteCache,
  updateMessageInInfiniteCache,
  deleteMessageFromInfiniteCache,
} from '@/lib/utils/infinite-query-cache'

export type DeliveryStatus = 'sending' | 'delivered' | 'seen'

export type ChatMessageWithStatus = ChatMessageEntity & {
  _deliveryStatus?: DeliveryStatus
}

/**
 * Helper function to create an optimistic message with consistent shape
 */
function createOptimisticMessage({
  tempId,
  roomId,
  content,
  type = 'TEXT',
  imageUrl,
  fileUrl,
  fileName,
  user,
  parent,
}: {
  tempId: string
  roomId: string
  content: string
  type?: ChatMessageEntityType
  imageUrl?: string | null
  fileUrl?: string | null
  fileName?: string | null
  user?: UserProfileEntity | null
  parent?: ChatMessageEntity
}): ChatMessageWithStatus {
  return {
    id: tempId,
    roomId,
    userId: user?.id || null,
    type: type ?? 'TEXT',
    content,
    imageUrl: imageUrl ?? null,
    fileUrl: fileUrl ?? null,
    fileName: fileName ?? null,
    linkUrl: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _deliveryStatus: 'sending',
    user: user
      ? {
          id: user.id,
          name: user.name,
          image: user.image,
        }
      : undefined,
    parent: parent ?? undefined,
  }
}

interface UseSendMessageOptions {
  roomId?: string
  user?: UserProfileEntity | null
}

export function useSendMessage({ roomId, user }: UseSendMessageOptions) {
  const queryClient = useQueryClient()

  return useChatControllerSendMessage({
    mutation: {
      onMutate: async (variables) => {
        if (!roomId) return

        const messagesQueryKey = getChatControllerGetMessagesInfiniteQueryKey(roomId, {
          limit: 50,
          direction: 'desc',
        })

        const roomsQueryKey = getChatControllerGetRoomsQueryKey()

        // Cancel outgoing refetches
        await queryClient.cancelQueries({ queryKey: messagesQueryKey })
        await queryClient.cancelQueries({ queryKey: roomsQueryKey })

        // Snapshot previous values for rollback
        const previousMessages = queryClient.getQueryData(messagesQueryKey)
        const previousRooms = queryClient.getQueryData(roomsQueryKey)

        const tempId = 'temp-' + Date.now()

        // Look up parent message from cache for optimistic reply rendering
        let parentMessage: ChatMessageEntity | undefined
        if (variables.data.parentId) {
          const currentMessages: any = queryClient.getQueryData(messagesQueryKey)
          const allItems: ChatMessageEntity[] =
            currentMessages?.pages?.flatMap((page: any) => page.data.items) || []
          parentMessage = allItems.find((m) => m.id === variables.data.parentId)
        }

        const optimisticMessage = createOptimisticMessage({
          tempId,
          roomId: variables.id,
          content: variables.data.content || '',
          type: variables.data.type,
          imageUrl: variables.data.imageUrl,
          fileUrl: variables.data.fileUrl,
          fileName: variables.data.fileName,
          user,
          parent: parentMessage,
        })

        // Optimistically add message to cache (infinite query structure)
        queryClient.setQueryData(messagesQueryKey, (old: any) =>
          addMessageToInfiniteCache(old, optimisticMessage),
        )

        // Optimistically update room in sidebar (move to top + update preview)
        queryClient.setQueryData(roomsQueryKey, (old: any) => {
          if (!old?.data) return old

          const currentRoom = old.data.find((r: ChatRoomEntity) => r.id === roomId)
          if (!currentRoom) return old

          const updatedRoom: ChatRoomEntity = {
            ...currentRoom,
            updatedAt: new Date().toISOString(),
            messages: [optimisticMessage],
          }

          // Remove room from current position and add to top
          const otherRooms = old.data.filter((r: ChatRoomEntity) => r.id !== roomId)

          return {
            ...old,
            data: [updatedRoom, ...otherRooms],
          }
        })

        return { previousMessages, previousRooms, messagesQueryKey, roomsQueryKey, tempId }
      },
      onSuccess: (data, _variables, context) => {
        if (!context?.messagesQueryKey) return

        const realMessage: ChatMessageWithStatus = { ...data.data, _deliveryStatus: 'delivered' }

        // Replace optimistic message with real one in chat window
        queryClient.setQueryData(context.messagesQueryKey, (old: any) =>
          replaceMessageInInfiniteCache(old, context.tempId, realMessage),
        )

        // Replace optimistic message with real one in room preview
        queryClient.setQueryData(context.roomsQueryKey, (old: any) => {
          if (!old?.data) return old

          return {
            ...old,
            data: old.data.map((room: ChatRoomEntity) => {
              if (room.id === roomId) {
                return {
                  ...room,
                  updatedAt: realMessage.createdAt,
                  messages: room.messages?.map((msg) =>
                    msg.id === context.tempId
                      ? {
                          id: realMessage.id,
                          content: realMessage.content,
                          type: realMessage.type,
                          createdAt: realMessage.createdAt,
                        }
                      : msg,
                  ),
                }
              }
              return room
            }),
          }
        })
      },
      onError: (_error, _variables, context) => {
        // Rollback on error
        if (context?.previousMessages && roomId) {
          queryClient.setQueryData(context.messagesQueryKey, context.previousMessages)
        }
        if (context?.previousRooms) {
          queryClient.setQueryData(context.roomsQueryKey, context.previousRooms)
        }
      },
    },
  })
}

export function useCreateDM() {
  const queryClient = useQueryClient()

  return useChatControllerCreateRoom({
    mutation: {
      onSuccess: () => {
        // Invalidate rooms query to refresh the list with the new room
        queryClient.invalidateQueries({ queryKey: getChatControllerGetRoomsQueryKey() })
      },
    },
  })
}

export function useCreateGroup() {
  const queryClient = useQueryClient()

  return useChatControllerCreateRoom({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getChatControllerGetRoomsQueryKey() })
      },
    },
  })
}

export function useEditMessage({ roomId }: { roomId: string }) {
  const queryClient = useQueryClient()

  return useChatControllerEditMessage({
    mutation: {
      onMutate: async (variables) => {
        const messagesQueryKey = getChatControllerGetMessagesInfiniteQueryKey(roomId, {
          limit: 50,
          direction: 'desc',
        })
        const roomsQueryKey = getChatControllerGetRoomsQueryKey()

        await queryClient.cancelQueries({ queryKey: messagesQueryKey })
        await queryClient.cancelQueries({ queryKey: roomsQueryKey })

        const previousMessages = queryClient.getQueryData(messagesQueryKey)
        const previousRooms = queryClient.getQueryData(roomsQueryKey)

        // Build optimistic message (updateMessageInInfiniteCache will merge with existing)
        const optimisticUpdate = {
          id: variables.id,
          content: variables.data.content,
          updatedAt: new Date().toISOString(),
        } as ChatMessageEntity

        // Optimistically update message in chat window
        queryClient.setQueryData(messagesQueryKey, (old: any) =>
          updateMessageInInfiniteCache(old, variables.id, optimisticUpdate),
        )

        // Optimistically update message in sidebar preview
        queryClient.setQueryData(roomsQueryKey, (old: any) => {
          if (!old?.data) return old
          return {
            ...old,
            data: old.data.map((room: ChatRoomEntity) => {
              if (room.id === roomId) {
                return {
                  ...room,
                  messages: room.messages?.map((msg) =>
                    msg.id === variables.id
                      ? {
                          ...msg,
                          content: variables.data.content,
                          updatedAt: new Date().toISOString(),
                        }
                      : msg,
                  ),
                }
              }
              return room
            }),
          }
        })

        return { previousMessages, previousRooms, messagesQueryKey, roomsQueryKey }
      },
      onSuccess: (data, _variables, context) => {
        const updatedMessage = data.data

        // Reuse the same function for consistency
        queryClient.setQueryData(context.messagesQueryKey, (old: any) =>
          updateMessageInInfiniteCache(old, updatedMessage.id, updatedMessage),
        )

        // Ensure room preview is perfectly in sync with real server data
        queryClient.setQueryData(context.roomsQueryKey, (old: any) => {
          if (!old?.data) return old
          return {
            ...old,
            data: old.data.map((room: ChatRoomEntity) => {
              if (room.id === roomId && room.messages?.[0]?.id === updatedMessage.id) {
                return { ...room, messages: [updatedMessage] }
              }
              return room
            }),
          }
        })
      },
      onError: (_error, _variables, context) => {
        if (context?.previousMessages) {
          queryClient.setQueryData(context.messagesQueryKey, context.previousMessages)
        }
        if (context?.previousRooms) {
          queryClient.setQueryData(context.roomsQueryKey, context.previousRooms)
        }
      },
    },
  })
}

export function useDeleteMessage({ roomId }: { roomId: string }) {
  const queryClient = useQueryClient()

  return useChatControllerDeleteMessage({
    mutation: {
      onMutate: async (variables) => {
        const messagesQueryKey = getChatControllerGetMessagesInfiniteQueryKey(roomId, {
          limit: 50,
          direction: 'desc',
        })
        const roomsQueryKey = getChatControllerGetRoomsQueryKey()

        await queryClient.cancelQueries({ queryKey: messagesQueryKey })
        await queryClient.cancelQueries({ queryKey: roomsQueryKey })

        const previousMessages = queryClient.getQueryData(messagesQueryKey)
        const previousRooms = queryClient.getQueryData(roomsQueryKey)

        // Optimistically delete message from chat window
        queryClient.setQueryData(messagesQueryKey, (old: any) =>
          deleteMessageFromInfiniteCache(old, variables.id),
        )

        // Optimistically update sidebar preview with next message
        queryClient.setQueryData(roomsQueryKey, (old: any) => {
          if (!old?.data) return old

          // Get current messages from cache after deletion
          const messagesData: any = queryClient.getQueryData(messagesQueryKey)

          const allMessages =
            messagesData?.pages?.flatMap((page: any) => page.data.items).reverse() || []
          const nextPreviewMessage = allMessages[allMessages.length - 1]

          return {
            ...old,
            data: old.data.map((room: ChatRoomEntity) => {
              if (room.id === roomId) {
                return {
                  ...room,
                  messages: nextPreviewMessage ? [nextPreviewMessage] : [],
                }
              }
              return room
            }),
          }
        })

        return { previousMessages, previousRooms, messagesQueryKey, roomsQueryKey }
      },
      onSuccess: (data, _variables, context) => {
        // Reapply soft delete with server response to ensure cache is in sync
        queryClient.setQueryData(context.messagesQueryKey, (old: any) =>
          deleteMessageFromInfiniteCache(old, data.data.id),
        )

        // If deleted message was the preview message, invalidate rooms to get the next one from server
        const rooms: any = context.previousRooms
        const room = rooms?.data?.find((r: any) => r.id === roomId)
        if (room?.messages?.[0]?.id === data.data.id) {
          queryClient.invalidateQueries({ queryKey: context.roomsQueryKey })
        }
      },
      onError: (_error, _variables, context) => {
        if (context?.previousMessages) {
          queryClient.setQueryData(context.messagesQueryKey, context.previousMessages)
        }
        if (context?.previousRooms) {
          queryClient.setQueryData(context.roomsQueryKey, context.previousRooms)
        }
      },
    },
  })
}
