'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ChevronLeft,
  ChevronRight,
  GitFork,
  LogIn,
  LogOut,
  MessageSquareHeart,
  Moon,
  Palette,
  Plus,
  Settings,
  ShieldCheck,
  Sun,
} from 'lucide-react'
import { useTheme } from '@unishare-oss/unitheme/react'
import { isDarkTheme } from '@unishare-oss/unitheme'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/lib/store'
import { UserAvatar } from '@/components/shared/user-avatar'
import { signOut } from '@/src/lib/auth/sign-out'
import { useAuth } from '@/contexts/auth-context'
import { FeedbackDialog } from '@/components/feedback/feedback-dialog'
import { Button } from '@/components/ui/button'
import { useUnreadChatCount } from '@/hooks/use-unread-chat-count'
import { useUnreadNotificationCount } from '@/hooks/use-unread-notification-count'
import { DARK_THEME, LIGHT_THEME } from '@/lib/theme'
import { countLabel, startSignIn, UnreadBadge } from '@/components/navigation/nav-shared'
import {
  buildVisibleNavigation,
  isNavItemActive,
  type NavigationItem,
} from '@/components/navigation/navigation-config'
import { NotoLogo } from '@/components/noto/noto-logo'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const rowBase =
  'relative flex w-full items-center gap-3.5 rounded-(--r-s) border-2 border-transparent px-3 py-2.5 text-[15px] font-semibold text-muted-foreground outline-none transition-[background-color,color,border-color] duration-150 motion-reduce:transition-none focus-visible:ring-[3px] focus-visible:ring-ring/50 hover:bg-surface-2 hover:text-ink max-[1180px]:justify-center max-[1180px]:px-0'

// Collapsed (by the toggle or below 1180px) the badge sits on the icon's corner.
const badgeCorner = 'absolute top-0.5 right-1.5 h-[18px] min-w-[18px] px-1 text-[10px]'
const badgeClass = (collapsed: boolean) =>
  collapsed
    ? badgeCorner
    : 'ml-auto max-[1180px]:absolute max-[1180px]:top-0.5 max-[1180px]:right-1.5 max-[1180px]:h-[18px] max-[1180px]:min-w-[18px] max-[1180px]:px-1 max-[1180px]:text-[10px]'

function SidebarLink({
  item,
  collapsed,
  badge = 0,
}: {
  item: NavigationItem
  collapsed: boolean
  badge?: number
}) {
  const pathname = usePathname()
  const active = isNavItemActive(pathname, item)
  const name = badge ? `${item.label} (${countLabel(badge)})` : item.label
  const link = (
    <Link
      href={item.href}
      aria-label={name}
      aria-current={active ? 'page' : undefined}
      className={cn(
        rowBase,
        collapsed && 'justify-center px-0',
        active && 'border-brand bg-brand-soft text-ink hover:bg-brand-soft',
      )}
    >
      <item.icon
        className={cn('size-[22px] shrink-0', active && 'text-brand-edge')}
        strokeWidth={2}
      />
      {!collapsed && <span className="truncate max-[1180px]:hidden">{item.label}</span>}
      <UnreadBadge count={badge} className={badgeClass(collapsed)} />
    </Link>
  )
  if (!collapsed) return link
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{name}</TooltipContent>
    </Tooltip>
  )
}

function SidebarButton({
  label,
  icon: Icon,
  collapsed,
  onClick,
}: {
  label: string
  icon: React.ElementType
  collapsed: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(rowBase, 'gap-3 px-3 py-2 text-[13px]', collapsed && 'justify-center px-0')}
    >
      <Icon className="size-[22px] shrink-0" strokeWidth={2} />
      {!collapsed && <span className="truncate max-[1180px]:hidden">{label}</span>}
    </button>
  )
}

function ThemeButton({ collapsed }: { collapsed: boolean }) {
  const { theme, setTheme } = useTheme()
  const dark = isDarkTheme(theme)
  const Icon = dark ? Sun : Moon
  const label = dark ? 'Light mode' : 'Dark mode'
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? LIGHT_THEME : DARK_THEME)}
      aria-label={label}
      className={cn(
        'mt-auto flex flex-none items-center gap-3 rounded-(--r-s) px-3 py-2 text-[13px] font-semibold text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 max-[1180px]:justify-center',
        collapsed && 'justify-center px-0',
      )}
    >
      <Icon className="size-[22px] shrink-0" strokeWidth={2} />
      {!collapsed && <span className="truncate max-[1180px]:hidden">{label}</span>}
    </button>
  )
}

function CollapsedModerationMenu({ items }: { items: NavigationItem[] }) {
  const pathname = usePathname()
  const active = items.some((item) => isNavItemActive(pathname, item))

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger
            aria-label="Moderation menu"
            aria-current={active ? 'page' : undefined}
            className={cn(rowBase, 'justify-center px-0', active && 'border-brand bg-brand-soft')}
          >
            <ShieldCheck
              className={cn('size-[22px]', active && 'text-brand-edge')}
              strokeWidth={2}
            />
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="right">Moderation</TooltipContent>
      </Tooltip>
      <DropdownMenuContent side="right" align="start" sideOffset={12} className="min-w-60">
        <DropdownMenuLabel className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Moderation
        </DropdownMenuLabel>
        {items.map((item) => (
          <DropdownMenuItem key={item.href} asChild>
            <Link
              href={item.href}
              aria-current={isNavItemActive(pathname, item) ? 'page' : undefined}
              className="gap-3 px-3 py-2 font-medium"
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
  const { user, session, isAuthenticated, isGuest } = useAuth()
  const sessionUser = session?.user
  const pathname = usePathname()
  const collapsed = useUIStore((state) => state.sidebarCollapsed)
  const toggleSidebar = useUIStore((state) => state.toggleSidebar)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const unreadChatCount = useUnreadChatCount()
  const unreadNotifications = useUnreadNotificationCount()
  const groups = buildVisibleNavigation(isAuthenticated, sessionUser?.role, user?.department?.id)
  const badges: Record<string, number> = {
    '/chat': unreadChatCount,
    '/notifications': unreadNotifications,
  }

  async function handleSignOut() {
    await signOut()
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        data-collapsed={collapsed}
        className="sticky top-0 hidden h-screen min-w-0 flex-col gap-[18px] py-[22px] md:flex"
      >
        <div className={cn('flex flex-none items-center', collapsed ? 'flex-col gap-2' : 'gap-2')}>
          <Link
            href="/feed"
            aria-label="Unishare, Today"
            className="flex flex-1 items-center gap-2.5 rounded-(--r-s) px-2.5 text-ink outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <NotoLogo className="size-9" />
            {!collapsed && (
              <b className="font-display text-[28px] leading-none font-extrabold tracking-[-0.02em] max-[1180px]:hidden">
                unishare
              </b>
            )}
          </Link>
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex size-8 shrink-0 items-center justify-center rounded-(--r-s) text-muted-foreground outline-none hover:bg-surface-2 max-[1180px]:hidden focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </button>
        </div>

        {isAuthenticated && (
          <Button
            asChild
            size="sm"
            className={cn(
              'mx-0.5 h-auto flex-none gap-2.5 px-3 py-1.5 text-[13px] shadow-[0_3px_0_var(--line)] aria-[current=page]:border-brand aria-[current=page]:bg-brand-soft max-[1180px]:px-0 max-[1180px]:py-2',
              collapsed && 'px-0',
            )}
          >
            <Link
              href="/posts/new"
              aria-label="Share a note"
              aria-current={pathname === '/posts/new' ? 'page' : undefined}
            >
              <Plus className="size-[18px]" strokeWidth={2} />
              {!collapsed && <span className="max-[1180px]:hidden">Share a note</span>}
            </Link>
          </Button>
        )}

        <div className="-m-0.5 min-h-0 flex-[0_1_auto] overflow-y-auto overscroll-contain p-0.5 [scrollbar-width:thin]">
          {groups.map((group) =>
            collapsed && group.id === 'moderation' ? (
              <div key={group.id} className="mt-1 border-t border-line pt-2">
                <CollapsedModerationMenu items={group.items} />
              </div>
            ) : (
              <nav
                key={group.id}
                aria-label={group.label}
                className="grid gap-1 [&+&]:mt-1 [&+&]:border-t [&+&]:border-line [&+&]:pt-2"
              >
                {group.items.map((item) => (
                  <SidebarLink
                    key={item.href}
                    item={item}
                    collapsed={collapsed}
                    badge={badges[item.href]}
                  />
                ))}
              </nav>
            ),
          )}
        </div>

        <ThemeButton collapsed={collapsed} />

        {isAuthenticated && sessionUser ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={`Account menu — ${sessionUser.name ?? 'User'}`}
              className={cn(
                'flex flex-none items-center gap-2.5 rounded-(--r-s) bg-surface px-2.5 py-2 text-left shadow-[inset_0_0_0_2px_var(--line)] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 max-[1180px]:justify-center max-[1180px]:px-0',
                collapsed && 'justify-center px-0',
              )}
            >
              <UserAvatar
                name={sessionUser.name ?? 'User'}
                image={sessionUser.image}
                size="md"
                priority
                className="size-[34px] rounded-full"
              />
              {!collapsed && (
                <span className="grid min-w-0 leading-tight max-[1180px]:hidden">
                  <b className="truncate text-sm">{sessionUser.name}</b>
                  <small className="truncate text-xs text-muted-foreground">
                    {user?.department
                      ? `${user.department.name}${user.yearLevel ? `, Year ${user.yearLevel}` : ''}`
                      : sessionUser.role}
                  </small>
                </span>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" className="min-w-60">
              <DropdownMenuLabel>{sessionUser.name}</DropdownMenuLabel>
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
        ) : collapsed ? (
          <>
            <SidebarButton label="Sign in" icon={LogIn} collapsed onClick={startSignIn} />
            {isGuest && (
              <SidebarButton
                label="Leave guest mode"
                icon={LogOut}
                collapsed
                onClick={handleSignOut}
              />
            )}
          </>
        ) : (
          // Below 1180px the card shrinks to its two buttons, which show only their icons.
          <div className="grid flex-none gap-2 rounded-(--r-s) bg-surface p-3 text-[13px] text-muted-foreground shadow-[inset_0_0_0_2px_var(--line)] max-[1180px]:bg-transparent max-[1180px]:p-0 max-[1180px]:shadow-none">
            <b className="text-sm text-ink max-[1180px]:hidden">Browsing as a guest</b>
            <span className="max-[1180px]:hidden">
              Sign in to share notes and see your courses.
            </span>
            <Button size="sm" aria-label="Sign in" onClick={startSignIn}>
              <LogIn className="hidden size-[18px] max-[1180px]:block" strokeWidth={2} />
              <span className="max-[1180px]:hidden">Sign in</span>
            </Button>
            {isGuest && (
              <Button
                size="sm"
                variant="ghost"
                aria-label="Leave guest mode"
                onClick={handleSignOut}
              >
                <LogOut className="hidden size-[18px] max-[1180px]:block" strokeWidth={2} />
                <span className="max-[1180px]:hidden">Leave guest mode</span>
              </Button>
            )}
          </div>
        )}
      </aside>
      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </TooltipProvider>
  )
}
