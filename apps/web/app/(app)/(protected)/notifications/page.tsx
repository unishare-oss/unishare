'use client'

import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { Bell, CheckCheck, Trash2, X } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useNotificationsControllerFindAll,
  useNotificationsControllerMarkAllRead,
  useNotificationsControllerDeleteAll,
  useNotificationsControllerDeleteOne,
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

  const { mutate: markAllRead, isPending: markingRead } = useNotificationsControllerMarkAllRead({
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

  const { mutate: clearAll, isPending: clearing } = useNotificationsControllerDeleteAll({
    mutation: {
      onSuccess: () => {
        queryClient.setQueryData(
          getNotificationsControllerFindAllQueryKey(),
          (old: { data: NotificationEntity[] } | undefined) => (old ? { ...old, data: [] } : old),
        )
      },
    },
  })

  const { mutate: deleteOne } = useNotificationsControllerDeleteOne({
    mutation: {
      onSuccess: (_, { id }) => {
        queryClient.setQueryData(
          getNotificationsControllerFindAllQueryKey(),
          (old: { data: NotificationEntity[] } | undefined) =>
            old ? { ...old, data: old.data.filter((n) => n.id !== id) } : old,
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
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead()}
                  disabled={markingRead}
                  className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-text-muted hover:text-foreground transition-colors duration-150 disabled:opacity-50"
                >
                  <CheckCheck className="size-3.5" strokeWidth={1.5} />
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={() => clearAll()}
                  disabled={clearing}
                  className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-text-muted hover:text-red-400 transition-colors duration-150 disabled:opacity-50"
                >
                  <Trash2 className="size-3.5" strokeWidth={1.5} />
                  Clear all
                </button>
              )}
            </div>
          </div>

          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Bell className="size-10 text-text-muted mb-4" strokeWidth={1} />
              <p className="text-sm text-text-muted">No notifications yet.</p>
            </div>
          ) : (
            <div className="flex flex-col border border-border rounded-[6px] overflow-hidden">
              {notifications.map((n, i) => (
                <div
                  key={n.id}
                  className={cn(
                    'group flex items-start gap-3 px-5 py-4 transition-colors duration-150',
                    i < notifications.length - 1 && 'border-b border-border',
                    !n.read && 'bg-amber/[0.04]',
                  )}
                >
                  <button
                    onClick={() => handleClick(n)}
                    disabled={!n.postId}
                    className="flex items-start gap-3 flex-1 text-left disabled:cursor-default"
                  >
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
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteOne({ id: n.id })
                    }}
                    className="shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400 transition-all duration-150"
                    aria-label="Delete notification"
                  >
                    <X className="size-3.5" strokeWidth={1.5} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
