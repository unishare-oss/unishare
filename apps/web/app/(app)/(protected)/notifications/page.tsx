'use client'

import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { Bell, CheckCheck } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useNotificationsControllerFindAll,
  useNotificationsControllerMarkOneRead,
  useNotificationsControllerMarkAllRead,
  getNotificationsControllerFindAllQueryKey,
} from '@/src/lib/api/generated/notifications/notifications'
import type { NotificationEntity } from '@/src/lib/api/generated/unishareAPI.schemas'
import { PageHeader } from '@/components/shared/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const NOTIFICATION_META: Record<string, { label: string; color: string }> = {
  POST_APPROVED: { label: 'Approved', color: 'text-info' },
  POST_REJECTED: { label: 'Rejected', color: 'text-red-400' },
  REQUEST_SUGGESTION_ADDED: { label: 'Suggestion', color: 'text-text-muted' },
  REQUEST_FULFILLED: { label: 'Fulfilled', color: 'text-success' },
  NEW_POST_FROM_FOLLOWED: { label: 'New Post', color: 'text-amber' },
  POST_COMMENT: { label: 'Comment', color: 'text-text-muted' },
  CHAT_MESSAGE: { label: 'Message', color: 'text-info' },
}

export default function NotificationsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data, isLoading } = useNotificationsControllerFindAll({
    query: { select: (r) => r.data },
  })

  const { mutate: markOneRead } = useNotificationsControllerMarkOneRead({
    mutation: {
      onSuccess: (_, { id }) => {
        queryClient.setQueryData(
          getNotificationsControllerFindAllQueryKey(),
          (old: { data: NotificationEntity[] } | undefined) =>
            old
              ? { ...old, data: old.data.map((n) => (n.id === id ? { ...n, read: true } : n)) }
              : old,
        )
      },
    },
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

  const notifications = (data ?? []).filter((n) => n.type !== 'CHAT_MESSAGE')
  const unreadCount = notifications.filter((n) => !n.read).length

  function handleClick(n: NotificationEntity) {
    if (!n.read) markOneRead({ id: n.id })
    if (n.requestId) router.push(`/requests/${n.requestId}`)
    else if (n.postId) router.push(`/posts/${n.postId}`)
    else if (n.chatRoomId) router.push(`/chat/${n.chatRoomId}`)
  }

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Notifications" />

      <div className="flex-1 bg-card">
        <div className="max-w-2xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
              {isLoading ? 'Loading…' : unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </h2>
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
          </div>

          {isLoading ? (
            <div className="flex flex-col border border-border rounded-[6px] overflow-hidden">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-start gap-3 px-5 py-4',
                    i < 4 && 'border-b border-border',
                  )}
                >
                  <Skeleton className="mt-1.5 size-1.5 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-3 w-14 shrink-0 mt-0.5" />
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
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
                    'flex items-start gap-3 px-5 py-4 text-left transition-colors duration-150',
                    i < notifications.length - 1 && 'border-b border-border',
                    !n.read && 'bg-amber/[0.04]',
                    n.postId || n.requestId || n.chatRoomId ? 'cursor-pointer' : 'cursor-default',
                  )}
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
                      NOTIFICATION_META[n.type]?.color ?? 'text-text-muted',
                    )}
                  >
                    {NOTIFICATION_META[n.type]?.label ?? 'Comment'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
