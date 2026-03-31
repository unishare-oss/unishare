import { useQueryClient } from '@tanstack/react-query'
import {
  useChatControllerSendMessage,
  useChatControllerCreateDM,
  getChatControllerGetMessagesInfiniteQueryKey,
  getChatControllerGetRoomsQueryKey,
} from '@/src/lib/api/generated/chat/chat'
import type {
  ChatMessageEntity,
  ChatRoomEntity,
  UserProfileEntity,
} from '@/src/lib/api/generated/unishareAPI.schemas'
import {
  addMessageToInfiniteCache,
  replaceMessageInInfiniteCache,
} from '@/lib/utils/infinite-query-cache'
import { useRouter } from 'next/navigation'

/**
 * Helper function to create an optimistic message with consistent shape
 */
function createOptimisticMessage({
  tempId,
  roomId,
  content,
  type = 'TEXT',
  user,
}: {
  tempId: string
  roomId: string
  content: string
  type?: string
  user?: UserProfileEntity | null
}): ChatMessageEntity {
  return {
    id: tempId,
    roomId,
    userId: user?.id || null,
    type: type as any,
    content,
    imageUrl: null,
    linkUrl: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    user: user
      ? {
          id: user.id,
          name: user.name,
          image: user.image,
        }
      : undefined,
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

        const optimisticMessage = createOptimisticMessage({
          tempId,
          roomId: variables.id,
          content: variables.data.content || '',
          type: variables.data.type,
          user,
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

        const realMessage = data.data

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

interface UseCreateDMOptions {
  user?: UserProfileEntity | null
  targetUser?: any
  targetUserId?: string
}

export function useCreateDM({ user, targetUser, targetUserId }: UseCreateDMOptions) {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useChatControllerCreateDM({
    mutation: {
      onMutate: async (variables) => {
        const roomsQueryKey = getChatControllerGetRoomsQueryKey()

        // Cancel outgoing refetches
        await queryClient.cancelQueries({ queryKey: roomsQueryKey })

        // Snapshot previous value for rollback
        const previousRooms = queryClient.getQueryData(roomsQueryKey)

        const tempId = 'temp-room-' + Date.now()
        const tempMessageId = 'temp-message-' + Date.now()

        // Optimistically add room to cache
        queryClient.setQueryData(roomsQueryKey, (old: any) => {
          if (!old?.data) return old

          const optimisticRoom = {
            id: tempId,
            type: 'DM',
            name: targetUser?.name || null,
            imageUrl: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            participants: [
              {
                id: 'temp-participant-' + user?.id,
                roomId: tempId,
                userId: user?.id,
                lastReadAt: new Date().toISOString(),
                joinedAt: new Date().toISOString(),
                user: user,
              },
              {
                id: 'temp-participant-' + targetUserId,
                roomId: tempId,
                userId: targetUserId,
                lastReadAt: new Date().toISOString(),
                joinedAt: new Date().toISOString(),
                user: targetUser,
              },
            ],
            messages: variables.data.initialMessage
              ? [
                  createOptimisticMessage({
                    tempId: tempMessageId,
                    roomId: tempId,
                    content: variables.data.initialMessage,
                    type: 'TEXT',
                    user,
                  }),
                ]
              : [],
          }

          return {
            ...old,
            data: [optimisticRoom, ...old.data],
          }
        })

        const messagesQueryKey = getChatControllerGetMessagesInfiniteQueryKey(tempId, {
          limit: 50,
          direction: 'desc',
        })

        // // Optimistically pre-populate messages query if there's an initial message
        // if (variables.data.initialMessage) {
        //   const optimisticMessage = createOptimisticMessage({
        //     tempId: tempMessageId,
        //     roomId: tempId,
        //     content: variables.data.initialMessage,
        //     type: 'TEXT',
        //     user,
        //   })

        //   queryClient.setQueryData(messagesQueryKey, {
        //     pages: [
        //       {
        //         data: {
        //           items: [optimisticMessage],
        //           nextCursor: null,
        //           hasMore: false,
        //         },
        //         success: true,
        //         message: 'Messages fetched successfully',
        //       },
        //     ],
        //     pageParams: [undefined],
        //   })
        // }

        return { previousRooms, roomsQueryKey, tempId, messagesQueryKey }
      },
      onSuccess: (data, _variables, context) => {
        if (!context?.roomsQueryKey) return

        const realRoom = data.data

        // Replace optimistic room with real one, ensuring messages are included
        queryClient.setQueryData(context.roomsQueryKey, (old: any) => {
          if (!old?.data) return old

          return {
            ...old,
            data: old.data.map((item: any) => {
              if (item.id === context.tempId) {
                // Ensure messages array is present in the real room data
                return {
                  ...realRoom,
                  messages: realRoom.messages || [],
                }
              }
              return item
            }),
          }
        })

        // Pre-populate messages query with initial message from room response
        if (realRoom.messages && realRoom.messages.length > 0) {
          queryClient.invalidateQueries({ queryKey: context.messagesQueryKey })
        }

        // Redirect to the new room
        router.push(`/chat/${data.data.id}`)
      },
      onError: (_error, _variables, context) => {
        // Rollback on error
        if (context?.previousRooms) {
          queryClient.setQueryData(context.roomsQueryKey, context.previousRooms)
        }
      },
    },
  })
}
