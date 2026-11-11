'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, LogIn, MessageSquare, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/auth-context'
import { useUnreadNotificationCount } from '@/hooks/use-unread-notification-count'
import { useUnreadChatCount } from '@/hooks/use-unread-chat-count'
import { signInWithUniauth } from '@/src/lib/auth/uniauth'
import { toast } from 'sonner'
import {
  isNavItemActive,
  mobileTabNavigation,
  type NavigationItem,
} from '@/components/navigation/navigation-config'

/* Glass: a translucent card with blur. Reduced transparency gets a solid background. */
const glass =
  'border-2 border-border bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 [@media(prefers-reduced-transparency:reduce)]:bg-background [@media(prefers-reduced-transparency:reduce)]:backdrop-blur-none'

const iconButton =
  'relative flex size-11 shrink-0 items-center justify-center rounded-xl text-text-muted outline-none transition-colors duration-200 hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50'

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="absolute -right-0.5 -top-0.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full border-2 border-card bg-primary px-1 font-mono text-[9px] font-bold leading-none text-primary-foreground">
      {count > 99 ? '99+' : count}
    </span>
  )
}

function TabLink({ item, isActive }: { item: NavigationItem; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex h-12 min-w-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-semibold outline-none transition-colors duration-200 focus-visible:ring-[3px] focus-visible:ring-ring/50',
        isActive ? 'bg-primary text-primary-foreground' : 'text-text-muted',
      )}
    >
      <item.icon className="size-5" strokeWidth={isActive ? 2 : 1.5} />
      <span>{item.label}</span>
    </Link>
  )
}

/** Phone chrome: a glass top bar and a glass bottom tab bar. Hidden from md up. */
export function MobileNav() {
  const pathname = usePathname()
  const { isAuthenticated, user } = useAuth()
  const unreadChatCount = useUnreadChatCount()
  const unreadNotifications = useUnreadNotificationCount()

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-40 box-content flex h-14 items-center gap-2 px-4 pt-[env(safe-area-inset-top)] md:hidden',
          glass,
          'border-x-0 border-t-0',
        )}
      >
        <Link href="/feed" aria-label="unishare — go to Today" className="flex items-center gap-2">
          <Image src="/noto.svg" alt="" width={28} height={28} />
          <span className="font-mono text-sm font-black tracking-tight">unishare</span>
        </Link>
        <div className="ml-auto flex items-center gap-1">
          {/* Helper rep pill: its slot takes no space until US-33 exists. */}
          {isAuthenticated ? (
            <>
              <Link href="/posts/new" aria-label="Share a note" className={iconButton}>
                <Plus className="size-5" strokeWidth={2} />
              </Link>
              <Link
                href="/chat"
                aria-label={unreadChatCount ? `Chat (${unreadChatCount} unread)` : 'Chat'}
                className={iconButton}
              >
                <MessageSquare className="size-5" strokeWidth={1.5} />
                <CountBadge count={unreadChatCount} />
              </Link>
              <Link
                href="/notifications"
                aria-label={
                  unreadNotifications
                    ? `Notifications (${unreadNotifications} unread)`
                    : 'Notifications'
                }
                className={iconButton}
              >
                <Bell className="size-5" strokeWidth={1.5} />
                <CountBadge count={unreadNotifications} />
              </Link>
            </>
          ) : (
            <button
              type="button"
              aria-label="Sign in"
              className={iconButton}
              onClick={() =>
                signInWithUniauth({ returnTo: window.location.href }).catch(() =>
                  toast.error('Could not start sign-in. Please try again.'),
                )
              }
            >
              <LogIn className="size-5" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </header>

      <nav
        aria-label="Primary tabs"
        className={cn(
          'fixed inset-x-3 z-40 flex h-16 items-center justify-around gap-1 rounded-2xl px-2 md:hidden [bottom:max(0.75rem,env(safe-area-inset-bottom))]',
          glass,
        )}
      >
        {mobileTabNavigation(user?.department?.id).map((item) => (
          <TabLink key={item.label} item={item} isActive={isNavItemActive(pathname, item)} />
        ))}
      </nav>
    </>
  )
}
