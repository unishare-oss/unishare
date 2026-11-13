import { useAuth } from '@/contexts/auth-context'
import { useNotificationsControllerFindAll } from '@/src/lib/api/generated/notifications/notifications'

/** Unread notifications for members. Chat messages count under Chat, not here. */
export function useUnreadNotificationCount(): number {
  const { isAuthenticated } = useAuth()
  const { data: notifications } = useNotificationsControllerFindAll({
    query: { select: (response) => response.data, enabled: isAuthenticated, staleTime: 1000 * 60 },
  })
  return (notifications ?? []).filter(
    (notification) => !notification.read && notification.type !== 'CHAT_MESSAGE',
  ).length
}
