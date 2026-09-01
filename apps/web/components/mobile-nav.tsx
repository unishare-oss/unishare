'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  BarChart2,
  Bell,
  Bookmark,
  BrainCircuit,
  Building2,
  CalendarDays,
  FileText,
  Flag,
  LayoutGrid,
  LayoutList,
  LogIn,
  LogOut,
  MessageSquare,
  MessageSquareHeart,
  MessageSquarePlus,
  MoreHorizontal,
  Palette,
  Plus,
  Presentation,
  Puzzle,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/auth-context'
import { useNotificationsControllerFindAll } from '@/src/lib/api/generated/notifications/notifications'
import { useUnreadChatCount } from '@/hooks/use-unread-chat-count'
import { useState } from 'react'
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer'
import { authClient } from '@/src/lib/auth/client'
import { UserAvatar } from '@/components/shared/user-avatar'
import { FeedbackDialog } from '@/components/feedback/feedback-dialog'
import { Button } from '@/components/ui/button'
import { useUniversitiesControllerFindOne } from '@/src/lib/api/generated/universities/universities'

const guestTabs = [
  { href: '/feed', label: 'Feed', icon: LayoutList },
  { href: '/saved', label: 'Saved', icon: Bookmark },
  { href: '/login', label: 'Sign In', icon: LogIn },
]

const primaryAuthTabs = [
  { href: '/feed', label: 'Feed', icon: LayoutList },
  { href: '/chat', label: 'Chat', icon: MessageSquare },
]

const trailingAuthTabs = [{ href: '/notifications', label: 'Notifications', icon: Bell }]

const moreAuthItems = [
  { href: '/my-posts', label: 'My Posts', icon: FileText },
  { href: '/boards', label: 'Boards', icon: LayoutGrid },
  { href: '/saved', label: 'Saved', icon: Bookmark },
  { href: '/requests', label: 'Requests', icon: MessageSquarePlus },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/departments', label: 'Departments', icon: Building2 },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/quizzes', label: 'Quizzes', icon: Puzzle },
  { href: '/decks', label: 'Decks', icon: Presentation },
  { href: '/profile', label: 'Settings', icon: Settings },
  { href: '/appearance', label: 'Appearance', icon: Palette },
]

/* Dock tile — spring-feel transition, solid filled active state. */
const dockTileBase =
  'relative flex size-11 items-center justify-center rounded-xl border-2 outline-none transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring'

const dockTileActive =
  'border-border-strong bg-primary text-primary-foreground shadow-[2px_2px_0_0_var(--shadow-color)]'

const dockTileIdle = 'border-transparent text-text-muted active:scale-95'

function DockBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-card bg-primary px-1 font-mono text-[9px] font-bold leading-none text-primary-foreground">
      {count > 99 ? '99+' : count}
    </span>
  )
}

function DockItem({
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
    <Link
      href={href}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      className={cn(dockTileBase, isActive ? dockTileActive : dockTileIdle)}
    >
      <Icon className="size-5" strokeWidth={isActive ? 2 : 1.5} />
      {badge != null && <DockBadge count={badge} />}
    </Link>
  )
}

export function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { isAuthenticated, session } = useAuth()
  const user = session?.user

  const { data: notifications } = useNotificationsControllerFindAll({
    query: { select: (r) => r.data, enabled: isAuthenticated, staleTime: 1000 * 60 },
  })
  const unreadCount = (notifications ?? []).filter(
    (n) => !n.read && n.type !== 'CHAT_MESSAGE',
  ).length
  const unreadChatCount = useUnreadChatCount()

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR'
  const isMoreActive =
    isAuthenticated &&
    (moreAuthItems.some((item) => pathname.startsWith(item.href)) ||
      (isAdmin && pathname.startsWith('/admin/')))

  const { data: userUniversity } = useUniversitiesControllerFindOne(user?.universityId ?? '', {
    query: { select: (r) => r.data, enabled: !!user?.universityId },
  })

  const [sheetOpen, setSheetOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  async function handleSignOut() {
    await authClient.signOut()
    router.replace('/login')
  }

  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed inset-x-3 z-40 [bottom:max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex h-16 items-center justify-around gap-1 rounded-2xl border-2 border-border-strong bg-card px-2 shadow-[4px_4px_0_0_var(--shadow-color)]">
        {isAuthenticated ? (
          <>
            {primaryAuthTabs.map((tab) => (
              <DockItem
                key={tab.href}
                href={tab.href}
                label={tab.label}
                icon={tab.icon}
                isActive={pathname.startsWith(tab.href)}
                badge={tab.href === '/chat' ? unreadChatCount : undefined}
              />
            ))}

            {/* Prominent create button */}
            <Link
              href="/posts/new"
              aria-label="Create post"
              className="flex size-12 shrink-0 items-center justify-center rounded-xl border-2 border-border-strong bg-primary text-primary-foreground shadow-[3px_3px_0_0_var(--shadow-color)] outline-none transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] focus-visible:ring-[3px] focus-visible:ring-ring/50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              <Plus className="size-6" strokeWidth={2.5} />
            </Link>

            {trailingAuthTabs.map((tab) => (
              <DockItem
                key={tab.href}
                href={tab.href}
                label={tab.label}
                icon={tab.icon}
                isActive={pathname.startsWith(tab.href)}
                badge={tab.href === '/notifications' ? unreadCount : undefined}
              />
            ))}

            <Drawer open={sheetOpen} onOpenChange={setSheetOpen}>
              <DrawerTrigger asChild>
                <button
                  aria-label="More"
                  className={cn(dockTileBase, isMoreActive ? dockTileActive : dockTileIdle)}
                >
                  <MoreHorizontal className="size-5" strokeWidth={isMoreActive ? 2 : 1.5} />
                </button>
              </DrawerTrigger>
              <DrawerContent className="px-0 pb-4 max-h-[85vh]">
                <DrawerTitle className="px-5 pt-1 pb-3 flex items-center gap-2">
                  <Image
                    src="/icon.svg"
                    alt="Unishare"
                    width={22}
                    height={22}
                    className="rounded-[4px] shrink-0"
                  />
                  <span className="font-mono text-sm font-bold tracking-tight text-foreground">
                    Unishare
                  </span>
                  {userUniversity?.logoUrl && (
                    <>
                      <span className="text-border select-none">|</span>
                      <Image
                        src={userUniversity.logoUrl}
                        alt={userUniversity.shortName}
                        width={22}
                        height={22}
                        className="shrink-0 object-contain"
                      />
                      <span className="font-mono text-sm font-bold tracking-tight text-foreground">
                        {userUniversity.shortName}
                      </span>
                    </>
                  )}
                </DrawerTitle>

                {user && (
                  <div className="px-5 py-3 border-b mb-2">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={user.name ?? 'User'} image={user.image} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                        <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                          {user.role}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="overflow-y-auto">
                  <div className="grid grid-cols-3 gap-1 px-3">
                    {moreAuthItems.map((item) => {
                      const isActive = pathname.startsWith(item.href)
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setSheetOpen(false)}
                          className={cn(
                            'flex flex-col items-center gap-2 px-3 py-4 rounded-xl transition-colors duration-200',
                            isActive
                              ? 'bg-accent text-accent-foreground font-bold'
                              : 'text-text-muted hover:bg-muted hover:text-foreground',
                          )}
                        >
                          <item.icon className="size-5" strokeWidth={1.5} />
                          <span className="text-[11px] font-mono uppercase tracking-wider">
                            {item.label}
                          </span>
                        </Link>
                      )
                    })}
                  </div>

                  {isAdmin && (
                    <>
                      <div className="px-5 pt-4 pb-2">
                        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                          Admin
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1 px-3">
                        {[
                          { href: '/admin/moderation', label: 'Moderation', icon: ShieldCheck },
                          { href: '/admin/reports', label: 'Reports', icon: Flag },
                          { href: '/admin/feedback', label: 'Feedback', icon: MessageSquareHeart },
                          { href: '/admin/departments', label: 'Depts', icon: Building2 },
                          { href: '/admin/quizzes', label: 'Gen Quiz', icon: BrainCircuit },
                          ...(user?.role === 'ADMIN'
                            ? [{ href: '/admin/users', label: 'Users', icon: Users }]
                            : []),
                        ].map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setSheetOpen(false)}
                            className={cn(
                              'flex flex-col items-center gap-2 px-3 py-4 rounded-xl transition-colors duration-200',
                              pathname.startsWith(item.href)
                                ? 'bg-accent text-accent-foreground font-bold'
                                : 'text-text-muted hover:bg-muted hover:text-foreground',
                            )}
                          >
                            <item.icon className="size-5" strokeWidth={1.5} />
                            <span className="text-[11px] font-mono uppercase tracking-wider">
                              {item.label}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                {/* end scrollable */}

                <div className="px-5 mt-4 border-t pt-4 flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    className="justify-start gap-3 text-text-muted"
                    onClick={() => {
                      setSheetOpen(false)
                      setFeedbackOpen(true)
                    }}
                  >
                    <MessageSquareHeart className="size-4" strokeWidth={1.5} />
                    Feedback or bug report
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start gap-3 text-red-500 hover:text-red-500 hover:bg-red-50"
                    onClick={handleSignOut}
                  >
                    <LogOut className="size-4" strokeWidth={1.5} />
                    Sign out
                  </Button>
                </div>
              </DrawerContent>
            </Drawer>
          </>
        ) : (
          guestTabs.map((tab) => (
            <DockItem
              key={tab.href}
              href={tab.href}
              label={tab.label}
              icon={tab.icon}
              isActive={pathname.startsWith(tab.href)}
            />
          ))
        )}
      </div>

      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </nav>
  )
}
