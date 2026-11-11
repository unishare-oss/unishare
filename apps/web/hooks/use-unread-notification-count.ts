'use client'

import { useAuth } from '@/contexts/auth-context'
import { useNotificationsControllerFindAll } from '@/src/lib/api/generated/notifications/notifications'

/** Unread notifications, not counting chat messages. One query, shared by the sidebar and the phone bar. */
export function useUnreadNotificationCount(): number {
  const { isAuthenticated } = useAuth()
  const { data } = useNotificationsControllerFindAll({
    query: { select: (response) => response.data, enabled: isAuthenticated, staleTime: 1000 * 15 },
  })
  return (data ?? []).filter(
    (notification) => !notification.read && notification.type !== 'CHAT_MESSAGE',
  ).length
}
