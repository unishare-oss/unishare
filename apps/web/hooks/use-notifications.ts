'use client'

import { useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getNotificationsControllerFindAllQueryKey } from '@/src/lib/api/generated/notifications/notifications'
import type { NotificationEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export function useNotificationStream(enabled: boolean) {
  const queryClient = useQueryClient()

  const handleNewNotification = useCallback(
    (notification: NotificationEntity) => {
      const key = getNotificationsControllerFindAllQueryKey()
      queryClient.setQueryData(key, (old: { data: NotificationEntity[] } | undefined) => ({
        ...(old ?? {}),
        data: [notification, ...(old?.data ?? [])],
      }))
    },
    [queryClient],
  )

  useEffect(() => {
    if (!enabled) return

    const es = new EventSource(`${API_URL}/notifications/stream`, { withCredentials: true })

    es.onmessage = (e) => {
      try {
        const notification = JSON.parse(e.data) as NotificationEntity
        handleNewNotification(notification)
      } catch {
        // ignore malformed events
      }
    }

    es.onerror = () => {
      // EventSource will auto-reconnect on error
    }

    return () => {
      es.close()
    }
  }, [enabled, handleNewNotification])
}
