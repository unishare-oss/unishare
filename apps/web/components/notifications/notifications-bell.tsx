'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell } from 'lucide-react'
import { useNotificationsControllerFindAll } from '@/src/lib/api/generated/notifications/notifications'
import { cn } from '@/lib/utils'

export function NotificationsBell() {
  const pathname = usePathname()
  const isActive = pathname.startsWith('/notifications')

  const { data } = useNotificationsControllerFindAll({
    query: { select: (r) => r.data, staleTime: 1000 * 60 },
  })

  const unreadCount = (data ?? []).filter((n) => !n.read).length

  return (
    <Link
      href="/notifications"
      className={cn(
        'group relative flex items-center gap-3 px-3 py-2 text-sm rounded-[6px] transition-all duration-200',
        isActive
          ? 'bg-gradient-to-r from-amber/[0.12] to-transparent text-amber font-medium'
          : 'text-text-muted hover:text-foreground hover:bg-muted',
      )}
    >
      <span
        className={cn(
          'absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-gradient-to-b from-amber/0 via-amber to-amber/0 transition-opacity duration-200',
          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-25',
        )}
      />
      <span className="relative">
        <Bell
          className={cn(
            'size-4 transition-colors duration-200',
            isActive ? 'text-amber' : 'text-text-muted group-hover:text-foreground',
          )}
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
