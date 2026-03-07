'use client'

import Link from 'next/link'
import { Bell } from 'lucide-react'
import { useNotificationsControllerFindAll } from '@/src/lib/api/generated/notifications/notifications'
import { cn } from '@/lib/utils'

interface NotificationsBellProps {
  className?: string
}

export function NotificationsBell({ className }: NotificationsBellProps) {
  const { data } = useNotificationsControllerFindAll({
    query: { select: (r) => r.data, staleTime: 1000 * 60 },
  })

  const notifications = data ?? []
  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <Link
      href="/notifications"
      aria-label="Notifications"
      className={cn(
        'group relative flex items-center gap-3 px-3 py-2 text-sm rounded-[6px] transition-all duration-200 text-text-muted hover:text-foreground hover:bg-muted',
        className,
      )}
    >
      <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-gradient-to-b from-amber/0 via-amber to-amber/0 opacity-0 group-hover:opacity-25 transition-opacity duration-200" />
      <span className="relative">
        <Bell
          className="size-4 text-text-muted group-hover:text-foreground transition-colors duration-200"
          strokeWidth={1.5}
        />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 size-1.5 rounded-full bg-amber" />
        )}
      </span>
      <span>Notifications</span>
      {unreadCount > 0 && (
        <span className="ml-auto font-mono text-[10px] bg-amber/20 text-amber px-1.5 py-0.5 rounded-full">
          {unreadCount}
        </span>
      )}
    </Link>
  )
}
