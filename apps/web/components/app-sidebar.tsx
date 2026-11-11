'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ChevronLeft,
  ChevronRight,
  GitFork,
  LogIn,
  LogOut,
  MessageSquareHeart,
  Palette,
  Plus,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/lib/store'
import { UserAvatar } from '@/components/shared/user-avatar'
import { toast } from 'sonner'
import { signOut } from '@/src/lib/auth/sign-out'
import { signInWithUniauth } from '@/src/lib/auth/uniauth'
import { useAuth } from '@/contexts/auth-context'
import { FeedbackDialog } from '@/components/feedback/feedback-dialog'
import { ThemeToggle } from '@/components/theme-toggle'
import { useUnreadChatCount } from '@/hooks/use-unread-chat-count'
import { useUnreadNotificationCount } from '@/hooks/use-unread-notification-count'
import { useCoursesControllerFindAllInfinite } from '@/src/lib/api/generated/courses/courses'
import { useFeedStore } from '@/lib/store'
import { useMediaQuery } from '@/hooks/use-media-query'
import {
  buildModerationNavigation,
  isNavItemActive,
  mainNavigation,
  sidebarNavigation,
  type NavigationItem,
} from '@/components/navigation/navigation-config'
import { Button } from '@/components/ui/button'
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
  tab,
  collapsed,
  badge,
}: {
  item: NavigationItem
  tab: string | null | undefined
  collapsed: boolean
  badge?: number
}) {
  const pathname = usePathname()
  const active = isNavItemActive(pathname, tab, item)
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
          ? 'border-border bg-primary text-primary-foreground'
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
      className={cn(
        'flex min-h-11 w-full items-center gap-3 rounded-xl border-2 border-transparent px-3 text-text-muted outline-none transition-[color,background-color] duration-200 motion-reduce:transition-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50',
        collapsed && 'w-11 justify-center px-0',
      )}
    >
      <Icon className="size-5 shrink-0" strokeWidth={1.5} />
      {!collapsed && <span className="truncate text-sm font-semibold">{label}</span>}
    </button>
  )
}

function ShareNoteButton({ collapsed }: { collapsed: boolean }) {
  const button = (
    <Button variant="quiet" asChild className={cn('w-full justify-start', collapsed && 'px-0')}>
      <Link href="/posts/new" aria-label="Share a note">
        <Plus className="size-4 shrink-0" strokeWidth={2} />
        {!collapsed && 'Share a note'}
      </Link>
    </Button>
  )
  if (!collapsed) return button
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right">Share a note</TooltipContent>
    </Tooltip>
  )
}

/** My courses: the student's department's courses for their year. Desktop only; hidden without both. */
function MyCourses() {
  const { user } = useAuth()
  const departmentId = user?.department?.id
  const yearLevel = user?.yearLevel
  const setPendingFilter = useFeedStore((state) => state.setPendingFilter)
  const desktop = useMediaQuery('(min-width: 768px)')
  const enabled = desktop && !!departmentId && !!yearLevel
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useCoursesControllerFindAllInfinite(
      { departmentId, limit: 100 },
      {
        query: {
          enabled,
          getNextPageParam: (last) =>
            last.data.page < last.data.totalPages ? last.data.page + 1 : undefined,
        },
      },
    )

  // Follow the pages until the last one, then filter by year on the client.
  useEffect(() => {
    if (enabled && hasNextPage && !isFetchingNextPage) void fetchNextPage()
  }, [enabled, hasNextPage, isFetchingNextPage, fetchNextPage])

  const courses = data?.pages.flatMap((page) => page.data.items) ?? []
  const mine = courses.filter((course) => course.yearLevel === yearLevel)
  if (!enabled || !departmentId || !yearLevel || mine.length === 0) return null

  return (
    <section aria-labelledby="nav-my-courses">
      <h2
        id="nav-my-courses"
        className="mb-1 px-3 font-mono text-[10px] font-bold uppercase tracking-widest text-text-muted"
      >
        My courses
      </h2>
      <ul className="space-y-1">
        {mine.map((course) => (
          <li key={course.id}>
            {/* Opens the feed filtered to this course, the same hand-off the department page uses. */}
            <Link
              href="/feed"
              onClick={() => setPendingFilter(departmentId, course.id, yearLevel)}
              className="flex min-h-11 flex-col justify-center rounded-xl px-3 text-text-muted outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <span className="font-mono text-xs font-bold">{course.code}</span>
              <span className="truncate text-xs">{course.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function AppSidebar({ tab }: { tab?: string | null }) {
  const { session, user, isAuthenticated, isGuest } = useAuth()
  const account = session?.user
  const collapsed = useUIStore((state) => state.sidebarCollapsed)
  const toggleSidebar = useUIStore((state) => state.toggleSidebar)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const unreadChatCount = useUnreadChatCount()
  const unreadNotifications = useUnreadNotificationCount()
  const main = mainNavigation(user?.department?.id)
  const moderation = buildModerationNavigation(account?.role)

  async function handleSignOut() {
    await signOut()
  }

  function badgeFor(href: string) {
    if (href === '/chat') return unreadChatCount
    if (href === '/notifications') return unreadNotifications
    return undefined
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        data-collapsed={collapsed}
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden flex-col border-r-2 border-border bg-card transition-[width] duration-200 motion-reduce:transition-none md:flex',
          collapsed ? 'w-[72px]' : 'w-[232px]',
        )}
      >
        <header
          className={cn(
            'flex h-[76px] shrink-0 items-center border-b-2 border-border px-3',
            collapsed ? 'justify-center' : 'gap-3',
          )}
        >
          <Link
            href="/feed"
            aria-label="UniShare — go to Today"
            className="shrink-0 rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <Image src="/noto.svg" alt="" width={40} height={40} priority />
          </Link>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="font-mono text-base font-black tracking-tight">unishare</p>
            </div>
          )}
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'flex size-11 shrink-0 items-center justify-center rounded-xl border-2 border-transparent text-text-muted outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50',
              collapsed && 'absolute left-[58px] top-4 size-8 border-border bg-card shadow-sm',
            )}
          >
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-5" />}
          </button>
        </header>

        {/* Only the middle scrolls: the logo above and the account area below stay put. */}
        <nav
          aria-label="Primary"
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 py-4 [scrollbar-width:thin]"
        >
          <div className={cn('space-y-1', collapsed && 'flex flex-col items-center')}>
            {main.map((item) => (
              <SidebarLink key={item.label} item={item} tab={tab} collapsed={collapsed} />
            ))}
          </div>

          {isAuthenticated && (
            <div className={cn('space-y-1', collapsed && 'flex flex-col items-center')}>
              {sidebarNavigation.map((item) => (
                <SidebarLink
                  key={item.href}
                  item={item}
                  tab={tab}
                  collapsed={collapsed}
                  badge={badgeFor(item.href)}
                />
              ))}
            </div>
          )}

          {isAuthenticated && <ShareNoteButton collapsed={collapsed} />}

          {isAuthenticated && !collapsed && <MyCourses />}

          {moderation.length > 0 && (
            <section aria-label="Moderation">
              {!collapsed && (
                <h2 className="mb-1 px-3 font-mono text-[10px] font-bold uppercase tracking-widest text-text-muted">
                  Moderation
                </h2>
              )}
              <div className={cn('space-y-1', collapsed && 'flex flex-col items-center')}>
                {moderation.map((item) => (
                  <SidebarLink key={item.href} item={item} tab={tab} collapsed={collapsed} />
                ))}
              </div>
            </section>
          )}
        </nav>

        <div className="shrink-0 space-y-1 border-t-2 border-border p-3">
          <ThemeToggle collapsed={collapsed} />
          {isAuthenticated && account ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  'flex min-h-11 w-full items-center gap-3 rounded-xl px-2 text-left outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50',
                  collapsed && 'justify-center px-0',
                )}
                aria-label={`Account menu — ${account.name ?? 'User'}`}
              >
                <UserAvatar
                  name={account.name ?? 'User'}
                  image={account.image}
                  size="md"
                  priority
                />
                {!collapsed && (
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">{account.name}</span>
                    <span className="block font-mono text-[10px] uppercase text-text-muted">
                      {account.role}
                    </span>
                  </span>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="right"
                align="end"
                className="min-w-60 rounded-xl border-2 border-border bg-popover p-1.5"
              >
                <DropdownMenuLabel>{account.name}</DropdownMenuLabel>
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
          ) : (
            <>
              {/* Straight to uniauth: the app shell only shows to guests here, and /login
                  sends anyone with a session (a guest's too) back to the feed. */}
              <SidebarButton
                label="Sign in"
                icon={LogIn}
                collapsed={collapsed}
                onClick={() =>
                  signInWithUniauth({ returnTo: window.location.href }).catch(() =>
                    toast.error('Could not start sign-in. Please try again.'),
                  )
                }
              />
              {isGuest && (
                <SidebarButton
                  label="Leave guest mode"
                  icon={LogOut}
                  collapsed={collapsed}
                  onClick={handleSignOut}
                />
              )}
            </>
          )}
        </div>
      </aside>
      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </TooltipProvider>
  )
}
