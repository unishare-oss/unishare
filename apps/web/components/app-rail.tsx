'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  GitFork,
  LogIn,
  LogOut,
  MessageSquareHeart,
  Palette,
  Settings,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/lib/store'
import { UserAvatar } from '@/components/shared/user-avatar'
import { authClient } from '@/src/lib/auth/client'
import { useAuth } from '@/contexts/auth-context'
import { FeedbackDialog } from '@/components/feedback/feedback-dialog'
import { useUnreadChatCount } from '@/hooks/use-unread-chat-count'
import { useNotificationsControllerFindAll } from '@/src/lib/api/generated/notifications/notifications'
import {
  buildVisibleNavigation,
  isRouteActive,
  type NavigationItem,
} from '@/components/navigation/navigation-config'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

function Badge({ count }: { count?: number }) {
  if (!count) return null
  return (
    <span className="ml-auto rounded-full border-2 border-card bg-primary px-1.5 font-mono text-[10px] font-bold text-primary-foreground">
      {count > 99 ? '99+' : count}
    </span>
  )
}

function SidebarLink({
  item,
  collapsed,
  badge,
}: {
  item: NavigationItem
  collapsed: boolean
  badge?: number
}) {
  const pathname = usePathname()
  const active = isRouteActive(pathname, item.href)
  const badgeLabel = badge ? ` (${badge > 99 ? '99+' : badge})` : ''
  const content = (
    <Link
      href={item.href}
      aria-label={`${item.label}${badgeLabel}`}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex min-h-11 items-center gap-3 rounded-xl border-2 px-3 outline-none transition-[color,background-color,box-shadow,transform] duration-200 motion-reduce:transition-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
        collapsed && 'w-11 justify-center px-0',
        active
          ? 'border-border-strong bg-primary text-primary-foreground shadow-[3px_3px_0_0_var(--shadow-color)]'
          : 'border-transparent text-text-muted hover:bg-accent hover:text-accent-foreground active:translate-y-px',
      )}
    >
      <item.icon className="size-5 shrink-0" strokeWidth={active ? 2 : 1.5} />
      {!collapsed && <span className="truncate text-sm font-semibold">{item.label}</span>}
      {!collapsed && <Badge count={badge} />}
      {collapsed && !!badge && (
        <span className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-card bg-primary" />
      )}
    </Link>
  )
  if (!collapsed) return content
  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="right">
        {item.label}
        {badge ? ` (${badge > 99 ? '99+' : badge})` : ''}
      </TooltipContent>
    </Tooltip>
  )
}

function CollapsedAdminMenu({ items }: { items: NavigationItem[] }) {
  const pathname = usePathname()
  const active = items.some((item) => isRouteActive(pathname, item.href))

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger
            aria-label="Admin menu"
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex size-11 items-center justify-center rounded-xl border-2 outline-none transition-[color,background-color,box-shadow,transform] duration-200 motion-reduce:transition-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
              active
                ? 'border-border-strong bg-primary text-primary-foreground shadow-[3px_3px_0_0_var(--shadow-color)]'
                : 'border-transparent text-text-muted hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <ShieldCheck className="size-5" strokeWidth={active ? 2 : 1.5} />
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="right">Admin</TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        side="right"
        align="start"
        sideOffset={12}
        className="min-w-60 rounded-xl border-2 border-border-strong bg-popover p-1.5 shadow-[4px_4px_0_0_var(--shadow-color)]"
      >
        <DropdownMenuLabel className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
          Admin
        </DropdownMenuLabel>
        {items.map((item) => (
          <DropdownMenuItem key={item.href} asChild>
            <Link
              href={item.href}
              aria-current={isRouteActive(pathname, item.href) ? 'page' : undefined}
              className="gap-3 rounded-lg px-3 py-2 font-medium"
            >
              <item.icon className="size-4" strokeWidth={1.5} />
              {item.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AppRail() {
  const router = useRouter()
  const { session, isAuthenticated } = useAuth()
  const user = session?.user
  const collapsed = useUIStore((state) => state.sidebarCollapsed)
  const toggleSidebar = useUIStore((state) => state.toggleSidebar)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const unreadChatCount = useUnreadChatCount()
  const { data: notifications } = useNotificationsControllerFindAll({
    query: { select: (response) => response.data, enabled: isAuthenticated },
  })
  const unreadNotifications = (notifications ?? []).filter(
    (notification) => !notification.read && notification.type !== 'CHAT_MESSAGE',
  ).length
  const groups = buildVisibleNavigation(isAuthenticated, user?.role)

  async function handleSignOut() {
    await authClient.signOut()
    router.replace('/login')
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        data-collapsed={collapsed}
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden flex-col border-r-2 border-border-strong bg-card transition-[width] duration-200 motion-reduce:transition-none md:flex',
          collapsed ? 'w-[72px]' : 'w-[232px]',
        )}
      >
        <header
          className={cn(
            'flex h-[76px] items-center border-b-2 border-border px-3',
            collapsed ? 'justify-center' : 'gap-3',
          )}
        >
          <Link
            href="/feed"
            aria-label="UniShare — go to feed"
            className="shrink-0 rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <Image
              src="/icon.svg"
              alt=""
              width={40}
              height={40}
              priority
              className="rounded-[9px]"
            />
          </Link>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="font-mono text-base font-black tracking-tight">UniShare</p>
            </div>
          )}
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'flex size-11 shrink-0 items-center justify-center rounded-xl border-2 border-transparent text-text-muted outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50',
              collapsed &&
                'absolute left-[58px] top-4 size-8 border-border-strong bg-card shadow-sm',
            )}
          >
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-5" />}
          </button>
        </header>

        <nav
          aria-label="Primary"
          className="flex-1 space-y-4 overflow-y-auto px-3 py-4 [scrollbar-width:thin]"
        >
          {groups.map((group) =>
            collapsed && group.id === 'admin' ? (
              <div key={group.id} className="flex justify-center">
                <CollapsedAdminMenu items={group.items} />
              </div>
            ) : (
              <section key={group.id} aria-labelledby={`nav-${group.id}`}>
                {!collapsed && (
                  <h2
                    id={`nav-${group.id}`}
                    className="mb-1 px-3 font-mono text-[10px] font-bold uppercase tracking-widest text-text-muted"
                  >
                    {group.label}
                  </h2>
                )}
                <div className={cn('space-y-1', collapsed && 'flex flex-col items-center')}>
                  {group.items.map((item) => (
                    <SidebarLink
                      key={item.href}
                      item={item}
                      collapsed={collapsed}
                      badge={item.href === '/chat' ? unreadChatCount : undefined}
                    />
                  ))}
                </div>
              </section>
            ),
          )}
        </nav>

        <div className="shrink-0 space-y-1 border-t-2 border-border p-3">
          {user ? (
            <>
              <SidebarLink
                item={{ href: '/notifications', label: 'Notifications', icon: Bell }}
                collapsed={collapsed}
                badge={unreadNotifications}
              />
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(
                    'flex min-h-11 w-full items-center gap-3 rounded-xl px-2 text-left outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50',
                    collapsed && 'justify-center px-0',
                  )}
                  aria-label={`Account menu — ${user.name ?? 'User'}`}
                >
                  <UserAvatar name={user.name ?? 'User'} image={user.image} size="md" priority />
                  {!collapsed && (
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{user.name}</span>
                      <span className="block font-mono text-[10px] uppercase text-text-muted">
                        {user.role}
                      </span>
                    </span>
                  )}
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="right"
                  align="end"
                  className="min-w-60 rounded-xl border-2 border-border-strong bg-popover p-1.5 shadow-[4px_4px_0_0_var(--shadow-color)]"
                >
                  <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <Settings />
                      Profile &amp; settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/appearance">
                      <Palette />
                      Theme &amp; appearance
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setFeedbackOpen(true)}>
                    <MessageSquareHeart />
                    Feedback or bug report
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a
                      href="https://github.com/unishare-oss/unishare"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <GitFork />
                      Open source · Contribute
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={handleSignOut}>
                    <LogOut />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <SidebarLink
              item={{ href: '/login', label: 'Sign In', icon: LogIn }}
              collapsed={collapsed}
            />
          )}
        </div>
      </aside>
      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </TooltipProvider>
  )
}
