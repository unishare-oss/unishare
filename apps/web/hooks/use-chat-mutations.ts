import { useQueryClient } from '@tanstack/react-query'
import {
  useChatControllerSendMessage,
  useChatControllerCreateRoom,
  getChatControllerGetMessagesInfiniteQueryKey,
  getChatControllerGetRoomsQueryKey,
} from '@/src/lib/api/generated/chat/chat'
import type {
  ChatMessageEntity,
  ChatRoomEntity,
  UserProfileEntity,
} from '@/src/lib/api/generated/unishareAPI.schemas'

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

        // Optimistically add message to cache (infinite query structure)
        queryClient.setQueryData(messagesQueryKey, (old: any) => {
          console.log(old)
          if (!old?.pages) return old

          const firstPage = old.pages[0]
          if (!firstPage?.data?.items) return old

          const optimisticMessage: ChatMessageEntity = {
            id: tempId,
            roomId: variables.id,
            userId: user?.id || null,
            type: variables.data.type as any,
            content: variables.data.content || null,
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

          // Add to beginning of first page (newest messages)
          return {
            ...old,
            pages: [
              {
                ...firstPage,
                data: {
                  ...firstPage.data,
                  items: [optimisticMessage, ...firstPage.data.items],
                },
              },
              ...old.pages.slice(1),
            ],
          }
        })

        // Optimistically update room in sidebar (move to top + update preview)
        queryClient.setQueryData(roomsQueryKey, (old: any) => {
          if (!old?.data) return old

          const currentRoom = old.data.find((r: ChatRoomEntity) => r.id === roomId)
          if (!currentRoom) return old

          // Create optimistic message matching ChatMessageEntity structure
          const optimisticMessage: Partial<ChatMessageEntity> = {
            id: tempId,
            roomId: roomId,
            userId: user?.id || null,
            content: variables.data.content || null,
            type: variables.data.type as any,
            createdAt: new Date().toISOString(),
          }

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
        queryClient.setQueryData(context.messagesQueryKey, (old: any) => {
          if (!old?.pages) return old

          return {
            ...old,
            pages: old.pages.map((page: any, index: number) => {
              if (index !== 0) return page // Only update first page (newest)

              return {
                ...page,
                data: {
                  ...page.data,
                  items: page.data.items.map((item: any) => {
                    // Replace ONLY the optimistic message
                    if (item.id === context.tempId) {
                      return realMessage
                    }
                    return item
                  }),
                },
              }
            }),
          }
        })

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

interface UseCreateRoomOptions {
  user?: UserProfileEntity | null
  targetUser?: any
  targetUserId?: string
}

export function useCreateRoom({ user, targetUser, targetUserId }: UseCreateRoomOptions) {
  const queryClient = useQueryClient()

  return useChatControllerCreateRoom({
    mutation: {
      onMutate: async (variables) => {
        const roomsQueryKey = getChatControllerGetRoomsQueryKey()

        // Cancel outgoing refetches
        await queryClient.cancelQueries({ queryKey: roomsQueryKey })

        // Snapshot previous value for rollback
        const previousRooms = queryClient.getQueryData(roomsQueryKey)

        const tempId = 'temp-room-' + Date.now()

        // Optimistically add room to cache
        queryClient.setQueryData(roomsQueryKey, (old: any) => {
          if (!old?.data) return old

          const optimisticRoom = {
            id: tempId,
            type: variables.data.type,
            name: variables.data.name || null,
            imageUrl: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            participants:
              variables.data.participantIds?.map((id) => ({
                id: 'temp-participant-' + id,
                roomId: tempId,
                userId: id,
                lastReadAt: new Date().toISOString(),
                joinedAt: new Date().toISOString(),
                user: id === targetUserId ? targetUser : user,
              })) || [],
            messages: [],
          }

          return {
            ...old,
            data: [optimisticRoom, ...old.data],
          }
        })

        return { previousRooms, roomsQueryKey, tempId }
      },
      onSuccess: (data, _variables, context) => {
        if (!context?.roomsQueryKey) return

        const realRoom = data.data

        // Replace optimistic room with real one
        queryClient.setQueryData(context.roomsQueryKey, (old: any) => {
          if (!old?.data) return old

          return {
            ...old,
            data: old.data.map((item: any) => {
              if (item.id === context.tempId) {
                return realRoom
              }
              return item
            }),
          }
        })

        // Refresh to ensure consistency
        queryClient.invalidateQueries({ queryKey: getChatControllerGetRoomsQueryKey() })
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
