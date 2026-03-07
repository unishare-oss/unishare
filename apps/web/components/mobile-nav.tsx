'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutList, FileText, Bookmark, User, LogIn, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { authClient } from '@/src/lib/auth/client'
import { useNotificationsControllerFindAll } from '@/src/lib/api/generated/notifications/notifications'

const guestTabs = [
  { href: '/', label: 'Feed', icon: LayoutList },
  { href: '/saved', label: 'Saved', icon: Bookmark },
  { href: '/login', label: 'Sign In', icon: LogIn },
]

const authTabs = [
  { href: '/', label: 'Feed', icon: LayoutList },
  { href: '/my-posts', label: 'Posts', icon: FileText },
  { href: '/saved', label: 'Saved', icon: Bookmark },
  { href: '/notifications', label: 'Notifs', icon: Bell },
  { href: '/profile', label: 'Profile', icon: User },
]

export function MobileNav() {
  const pathname = usePathname()
  const { data: session } = authClient.useSession()
  const tabs = session ? authTabs : guestTabs

  const { data: notifications } = useNotificationsControllerFindAll({
    query: { select: (r) => r.data, enabled: !!session?.user, staleTime: 1000 * 60 },
  })
  const unreadCount = (notifications ?? []).filter((n) => !n.read).length

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border">
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const isActive = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href)
          const showBadge = tab.href === '/notifications' && unreadCount > 0
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'relative flex flex-col items-center gap-1 px-3 py-1.5 transition-colors duration-200',
                isActive ? 'text-amber' : 'text-text-muted',
              )}
            >
              <span
                className={cn(
                  'absolute top-0 left-1/2 -translate-x-1/2 h-[2px] rounded-full bg-gradient-to-r from-amber/0 via-amber to-amber/0 transition-all duration-200',
                  isActive ? 'w-8 opacity-100' : 'w-0 opacity-0',
                )}
              />
              <span className="relative">
                <tab.icon className="size-5" strokeWidth={1.5} />
                {showBadge && (
                  <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-amber" />
                )}
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
