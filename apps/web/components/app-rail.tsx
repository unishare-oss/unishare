'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutList,
  FileText,
  Bookmark,
  Building2,
  ShieldCheck,
  Flag,
  Settings,
  LogOut,
  LogIn,
  Users,
  BarChart2,
  Palette,
  MessageSquare,
  MessageSquarePlus,
  MessageSquareHeart,
  LayoutGrid,
  BrainCircuit,
  Puzzle,
  Bell,
  GitFork,
  MoreHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { UserAvatar } from '@/components/shared/user-avatar'
import { authClient } from '@/src/lib/auth/client'
import { useAuth } from '@/contexts/auth-context'
import { FeedbackDialog } from '@/components/feedback/feedback-dialog'
import { useUnreadChatCount } from '@/hooks/use-unread-chat-count'
import { useNotificationsControllerFindAll } from '@/src/lib/api/generated/notifications/notifications'
import { useUniversitiesControllerFindOne } from '@/src/lib/api/generated/universities/universities'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const publicNavItems = [
  { href: '/feed', label: 'Feed', icon: LayoutList },
  { href: '/saved', label: 'Saved', icon: Bookmark },
  { href: '/departments', label: 'Departments', icon: Building2 },
]

const authNavItems = [
  { href: '/feed', label: 'Feed', icon: LayoutList },
  { href: '/chat', label: 'Chat', icon: MessageSquare },
  { href: '/my-posts', label: 'My Posts', icon: FileText },
  { href: '/boards', label: 'Boards', icon: LayoutGrid },
  { href: '/saved', label: 'Saved', icon: Bookmark },
  { href: '/requests', label: 'Requests', icon: MessageSquarePlus },
  { href: '/departments', label: 'Departments', icon: Building2 },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/quizzes', label: 'Quizzes', icon: Puzzle },
]

const adminItems = [
  { href: '/admin/moderation', label: 'Moderation', icon: ShieldCheck },
  { href: '/admin/reports', label: 'Reports', icon: Flag },
  { href: '/admin/feedback', label: 'Feedback', icon: MessageSquareHeart },
  { href: '/admin/departments', label: 'Manage Depts', icon: Building2 },
  { href: '/admin/quizzes', label: 'Generate Quiz', icon: BrainCircuit },
]

const adminOnlyItems = [{ href: '/admin/users', label: 'Users', icon: Users }]

/* Shared tile styling — spring-feel transition, chunky pressed-card active state. */
const tileBase =
  'relative flex size-11 shrink-0 items-center justify-center rounded-xl border-2 outline-none transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring'

const tileActive =
  'border-border-strong bg-primary text-primary-foreground shadow-[3px_3px_0_0_var(--shadow-color)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'

const tileIdle =
  'border-transparent text-text-muted hover:bg-accent hover:text-accent-foreground active:scale-95'

function TileBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="absolute -top-1.5 -right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-card bg-primary px-1 font-mono text-[9px] font-bold leading-none text-primary-foreground">
      {count > 99 ? '99+' : count}
    </span>
  )
}

function RailItem({
  href,
  label,
  icon: Icon,
  isActive,
  badge,
}: {
  href: string
  label: string
  icon: React.ElementType
  isActive: boolean
  badge?: number
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={href}
          aria-label={label}
          aria-current={isActive ? 'page' : undefined}
          className={cn(tileBase, isActive ? tileActive : tileIdle)}
        >
          <Icon className="size-5" strokeWidth={isActive ? 2 : 1.5} />
          {badge != null && <TileBadge count={badge} />}
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
        {badge != null && badge > 0 ? ` (${badge})` : ''}
      </TooltipContent>
    </Tooltip>
  )
}

/* Bell lives at the rail bottom; mounted only when authenticated. */
function RailBell() {
  const pathname = usePathname()
  const isActive = pathname.startsWith('/notifications')
  const { data } = useNotificationsControllerFindAll({ query: { select: (r) => r.data } })
  const unreadCount = (data ?? []).filter((n) => !n.read && n.type !== 'CHAT_MESSAGE').length

  return (
    <RailItem
      href="/notifications"
      label="Notifications"
      icon={Bell}
      isActive={isActive}
      badge={unreadCount}
    />
  )
}

const menuContentClass =
  'min-w-56 rounded-xl border-2 border-border-strong bg-popover p-1.5 shadow-[4px_4px_0_0_var(--shadow-color)]'

const menuItemClass = 'gap-3 rounded-lg px-3 py-2 font-medium'

export function AppRail() {
  const pathname = usePathname()
  const router = useRouter()
  const { session } = useAuth()
  const user = session?.user
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR'
  const isSuperAdmin = user?.role === 'ADMIN'
  const unreadChatCount = useUnreadChatCount()

  const { data: userUniversity } = useUniversitiesControllerFindOne(user?.universityId ?? '', {
    query: { select: (r) => r.data, enabled: !!user?.universityId },
  })

  const navItems = user ? authNavItems : publicNavItems
  const isAdminActive = pathname.startsWith('/admin/')
  const visibleAdminItems = [...adminItems, ...(isSuperAdmin ? adminOnlyItems : [])]

  async function handleSignOut() {
    await authClient.signOut()
    router.replace('/login')
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside className="hidden md:flex fixed left-0 top-0 z-30 h-screen w-[72px] flex-col items-center border-r-2 border-border-strong bg-card">
        {/* Logo mark */}
        <Link
          href="/feed"
          aria-label="Unishare — go to feed"
          className="mt-4 flex size-11 shrink-0 items-center justify-center rounded-xl outline-none transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-105 active:scale-95 focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <Image
            src="/icon.svg"
            alt="Unishare logo"
            width={34}
            height={34}
            loading="eager"
            className="rounded-[8px]"
          />
        </Link>

        {/* Primary navigation */}
        <nav
          aria-label="Primary"
          className="mt-3 flex w-full flex-1 flex-col items-center gap-1.5 overflow-y-auto py-2 [scrollbar-width:none]"
        >
          {navItems.map((item) => (
            <RailItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              isActive={pathname.startsWith(item.href)}
              badge={item.href === '/chat' ? unreadChatCount : undefined}
            />
          ))}

          {isAdmin && (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger
                    aria-label="Admin menu"
                    className={cn(tileBase, isAdminActive ? tileActive : tileIdle)}
                  >
                    <ShieldCheck className="size-5" strokeWidth={isAdminActive ? 2 : 1.5} />
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  Admin
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent
                side="right"
                align="start"
                sideOffset={10}
                className={menuContentClass}
              >
                <DropdownMenuLabel className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
                  Admin
                </DropdownMenuLabel>
                {visibleAdminItems.map((item) => (
                  <DropdownMenuItem key={item.href} asChild className={menuItemClass}>
                    <Link
                      href={item.href}
                      aria-current={pathname.startsWith(item.href) ? 'page' : undefined}
                    >
                      <item.icon className="size-4" strokeWidth={1.5} />
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>

        {/* Bottom cluster: notifications + profile (auth) / extras + sign-in (guest) */}
        <div className="flex w-full shrink-0 flex-col items-center gap-1.5 border-t-2 border-border py-3">
          {user ? (
            <>
              <RailBell />
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger
                      aria-label={`Account menu — ${user.name ?? 'User'}`}
                      className="flex size-11 items-center justify-center rounded-xl outline-none transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-105 active:scale-95 focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=open]:scale-105"
                    >
                      <UserAvatar
                        name={user.name ?? 'User'}
                        image={user.image}
                        size="md"
                        priority
                      />
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {user.name}
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent
                  side="right"
                  align="end"
                  sideOffset={10}
                  className={menuContentClass}
                >
                  <DropdownMenuLabel className="flex items-center gap-3 px-3 py-2">
                    <UserAvatar name={user.name ?? 'User'} image={user.image} size="md" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-bold text-foreground">
                        {user.name}
                      </span>
                      <span className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
                        {user.role}
                      </span>
                    </span>
                    {userUniversity?.logoUrl && (
                      <Image
                        src={userUniversity.logoUrl}
                        alt={userUniversity.shortName}
                        width={32}
                        height={32}
                        className="shrink-0 object-contain"
                        title={userUniversity.name}
                      />
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className={menuItemClass}>
                    <Link href="/profile">
                      <Settings className="size-4" strokeWidth={1.5} />
                      Profile &amp; settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className={menuItemClass}>
                    <Link href="/appearance">
                      <Palette className="size-4" strokeWidth={1.5} />
                      Theme &amp; appearance
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className={menuItemClass}
                    onSelect={() => setFeedbackOpen(true)}
                  >
                    <MessageSquareHeart className="size-4" strokeWidth={1.5} />
                    Feedback or bug report
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className={menuItemClass}>
                    <a
                      href="https://github.com/unishare-oss/unishare"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <GitFork className="size-4" strokeWidth={1.5} />
                      Open source · Contribute
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    className={menuItemClass}
                    onSelect={handleSignOut}
                  >
                    <LogOut className="size-4" strokeWidth={1.5} />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger aria-label="More" className={cn(tileBase, tileIdle)}>
                      <MoreHorizontal className="size-5" strokeWidth={1.5} />
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    More
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent
                  side="right"
                  align="end"
                  sideOffset={10}
                  className={menuContentClass}
                >
                  <DropdownMenuItem
                    className={menuItemClass}
                    onSelect={() => setFeedbackOpen(true)}
                  >
                    <MessageSquareHeart className="size-4" strokeWidth={1.5} />
                    Feedback or bug report
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className={menuItemClass}>
                    <a
                      href="https://github.com/unishare-oss/unishare"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <GitFork className="size-4" strokeWidth={1.5} />
                      Open source · Contribute
                    </a>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <RailItem
                href="/login"
                label="Sign in"
                icon={LogIn}
                isActive={pathname.startsWith('/login')}
              />
            </>
          )}
        </div>
      </aside>

      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </TooltipProvider>
  )
}
