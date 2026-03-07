'use client'

import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { Bell, CheckCheck } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useNotificationsControllerFindAll,
  useNotificationsControllerMarkAllRead,
  getNotificationsControllerFindAllQueryKey,
} from '@/src/lib/api/generated/notifications/notifications'
import type { NotificationEntity } from '@/src/lib/api/generated/unishareAPI.schemas'
import { PageHeader } from '@/components/shared/page-header'
import { cn } from '@/lib/utils'

export default function NotificationsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data } = useNotificationsControllerFindAll({
    query: { select: (r) => r.data },
  })

  const { mutate: markAllRead, isPending } = useNotificationsControllerMarkAllRead({
    mutation: {
      onSuccess: () => {
        queryClient.setQueryData(
          getNotificationsControllerFindAllQueryKey(),
          (old: { data: NotificationEntity[] } | undefined) =>
            old ? { ...old, data: old.data.map((n) => ({ ...n, read: true })) } : old,
        )
      },
    },
  })

  const notifications = data ?? []
  const unreadCount = notifications.filter((n) => !n.read).length

  function handleClick(n: NotificationEntity) {
    if (n.postId) {
      router.push(`/posts/${n.postId}`)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Notifications" />

      <div className="flex-1 bg-card">
        <div className="max-w-2xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </h2>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead()}
                disabled={isPending}
                className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-text-muted hover:text-foreground transition-colors duration-150 disabled:opacity-50"
              >
                <CheckCheck className="size-3.5" strokeWidth={1.5} />
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Bell className="size-10 text-text-muted mb-4" strokeWidth={1} />
              <p className="text-sm text-text-muted">No notifications yet.</p>
            </div>
          ) : (
            <div className="flex flex-col border border-border rounded-[6px] overflow-hidden">
              {notifications.map((n, i) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={cn(
                    'text-left px-5 py-4 transition-colors duration-150 hover:bg-muted',
                    i < notifications.length - 1 && 'border-b border-border',
                    !n.read && 'bg-amber/4',
                    !n.postId && 'cursor-default',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        'mt-1.5 shrink-0 size-1.5 rounded-full',
                        !n.read ? 'bg-amber' : 'bg-transparent',
                      )}
                    />
                    <div className="flex-1">
                      <p className="text-sm text-foreground leading-snug">{n.message}</p>
                      <p className="font-mono text-[10px] text-text-muted mt-1.5">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'font-mono text-[10px] uppercase tracking-wider shrink-0 mt-0.5',
                        n.type === 'POST_APPROVED'
                          ? 'text-info'
                          : n.type === 'POST_REJECTED'
                            ? 'text-red-400'
                            : 'text-text-muted',
                      )}
                    >
                      {n.type === 'POST_APPROVED'
                        ? 'Approved'
                        : n.type === 'POST_REJECTED'
                          ? 'Rejected'
                          : 'Comment'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
