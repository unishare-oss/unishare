import { useChatControllerGetRooms } from '@/src/lib/api/generated/chat/chat'
import { useAuth } from '@/contexts/auth-context'

export function useUnreadChatCount() {
  const { session, isAuthenticated } = useAuth()
  const currentUserId = session?.user?.id

  const { data: roomsResponse } = useChatControllerGetRooms({
    query: { enabled: isAuthenticated },
  })

  const rooms = roomsResponse?.data ?? []

  const unreadCount = rooms.reduce((count, room) => {
    const lastMessage = room.messages?.[0]
    if (!lastMessage) return count

    // Don't count messages sent by the current user
    if (lastMessage.userId === currentUserId) return count

    const myParticipant = room.participants?.find((p) => p.userId === currentUserId)
    if (!myParticipant) return count

    const lastReadAt = new Date(myParticipant.lastReadAt).getTime()
    const messageAt = new Date(lastMessage.createdAt).getTime()

    return messageAt > lastReadAt ? count + 1 : count
  }, 0)

  return unreadCount
}
