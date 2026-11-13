'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, LogOut, MessageSquare, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/auth-context'
import { useUnreadChatCount } from '@/hooks/use-unread-chat-count'
import { useUnreadNotificationCount } from '@/hooks/use-unread-notification-count'
import { signOut } from '@/src/lib/auth/sign-out'
import { Button } from '@/components/ui/button'
import {
  buildVisibleNavigation,
  guestPhoneTabs,
  isNavItemActive,
  isRouteActive,
} from '@/components/navigation/navigation-config'
import { countLabel, startSignIn, UnreadBadge } from '@/components/navigation/nav-shared'
import { NotoLogo } from '@/components/noto/noto-logo'

const pill =
  'relative grid size-[34px] place-items-center rounded-full text-ink outline-none transition-transform active:scale-[0.94] focus-visible:ring-[3px] focus-visible:ring-ring/50'

function TopBarLink({
  href,
  label,
  icon: Icon,
  count = 0,
}: {
  href: string
  label: string
  icon: React.ElementType
  count?: number
}) {
  const pathname = usePathname()
  return (
    <Link
      href={href}
      aria-label={count ? `${label} (${countLabel(count)})` : label}
      aria-current={isRouteActive(pathname, href) ? 'page' : undefined}
      className={pill}
    >
      <Icon className="size-5" strokeWidth={2} />
      <UnreadBadge
        count={count}
        className="absolute -top-0.5 -right-1 h-[17px] min-w-[17px] px-1 text-[10px]"
      />
    </Link>
  )
}

export function MobileNav() {
  const pathname = usePathname()
  const { user, isAuthenticated, isGuest } = useAuth()
  const unreadChatCount = useUnreadChatCount()
  const unreadNotifications = useUnreadNotificationCount()

  const tabs = isAuthenticated
    ? buildVisibleNavigation(true, null, user?.department?.id)[0].items
    : guestPhoneTabs

  async function handleSignOut() {
    await signOut()
  }

  return (
    <div className="md:hidden">
      <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between gap-2.5 bg-glass px-4 pt-[calc(12px+env(safe-area-inset-top))] pb-3 backdrop-blur-[16px] backdrop-saturate-[170%] [@media(prefers-reduced-transparency:reduce)]:bg-background [@media(prefers-reduced-transparency:reduce)]:backdrop-blur-none">
        <Link
          href="/feed"
          aria-label="Unishare, Today"
          className="flex items-center gap-2.5 rounded-(--r-s) text-ink outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <NotoLogo className="size-9" />
          <b className="font-display text-2xl leading-none font-extrabold tracking-[-0.02em]">
            unishare
          </b>
        </Link>
        {isAuthenticated ? (
          <div className="flex gap-2">
            <TopBarLink href="/chat" label="Chat" icon={MessageSquare} count={unreadChatCount} />
            <TopBarLink
              href="/notifications"
              label="Notifications"
              icon={Bell}
              count={unreadNotifications}
            />
            <Link
              href="/posts/new"
              aria-label="Share a note"
              className={cn(pill, 'bg-surface shadow-[inset_0_0_0_2px_var(--line)]')}
            >
              <Plus className="size-[18px]" strokeWidth={2} />
            </Link>
          </div>
        ) : (
          // Straight to uniauth: /login sends anyone with a session (a guest's too) away.
          <div className="flex shrink-0 items-center gap-2">
            <Button size="sm" onClick={startSignIn}>
              Sign in
            </Button>
            {isGuest && (
              <button
                type="button"
                onClick={handleSignOut}
                aria-label="Leave guest mode"
                title="Leave guest mode"
                className={pill}
              >
                <LogOut className="size-5" strokeWidth={2} />
              </button>
            )}
          </div>
        )}
      </header>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 grid auto-cols-fr grid-flow-col border-t border-line bg-glass pt-1.5 pr-[max(8px,env(safe-area-inset-right))] pb-[calc(6px+env(safe-area-inset-bottom))] pl-[max(8px,env(safe-area-inset-left))] backdrop-blur-[20px] backdrop-saturate-[170%] [@media(prefers-reduced-transparency:reduce)]:bg-background [@media(prefers-reduced-transparency:reduce)]:backdrop-blur-none"
      >
        {tabs.map((tab) => {
          const active = isNavItemActive(pathname, tab)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'grid justify-items-center gap-0.5 rounded-(--r-s) py-1.5 text-[11px] font-semibold text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                active && 'text-brand-edge',
              )}
            >
              <tab.icon className="size-[22px]" strokeWidth={2} />
              {isAuthenticated ? (tab.shortLabel ?? tab.label) : tab.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
