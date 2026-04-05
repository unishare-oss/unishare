'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useParams, useRouter } from 'next/navigation'
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
  LayoutGrid,
  ChevronLeft,
  ChevronDown,
  MessageSquareHeart,
  BrainCircuit,
  Puzzle,
  PanelLeftClose,
  PanelLeft,
  GitFork,
} from 'lucide-react'
import { ChatSidebar } from '@/components/chat/chat-sidebar'
import { FeedbackDialog } from '@/components/feedback/feedback-dialog'
import { cn } from '@/lib/utils'
import { UserAvatar } from '@/components/shared/user-avatar'
import { authClient } from '@/src/lib/auth/client'
import { useAuth } from '@/contexts/auth-context'
import { useUIStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { NotificationsBell } from '@/components/notifications/notifications-bell'
import { useUniversitiesControllerFindOne } from '@/src/lib/api/generated/universities/universities'
import { AnimatePresence, motion } from 'framer-motion'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const publicNavItems = [
  { href: '/feed', label: 'Feed', icon: LayoutList },
  { href: '/saved', label: 'Saved', icon: Bookmark },
  { href: '/departments', label: 'Departments', icon: Building2 },
]

const authNavGroups = [
  {
    label: null as string | null,
    items: [
      { href: '/feed', label: 'Feed', icon: LayoutList },
      { href: '/chat', label: 'Chat', icon: MessageSquare },
    ],
  },
  {
    label: 'Content' as string | null,
    items: [
      { href: '/my-posts', label: 'My Posts', icon: FileText },
      { href: '/boards', label: 'Boards', icon: LayoutGrid },
      { href: '/saved', label: 'Saved', icon: Bookmark },
      { href: '/requests', label: 'Requests', icon: MessageSquarePlus },
    ],
  },
  {
    label: 'Explore' as string | null,
    items: [
      { href: '/departments', label: 'Departments', icon: Building2 },
      { href: '/analytics', label: 'Analytics', icon: BarChart2 },
      { href: '/quizzes', label: 'Quizzes', icon: Puzzle },
    ],
  },
]

const adminItems = [
  { href: '/admin/moderation', label: 'Moderation', icon: ShieldCheck },
  { href: '/admin/reports', label: 'Reports', icon: Flag },
  { href: '/admin/feedback', label: 'Feedback', icon: MessageSquareHeart },
  { href: '/admin/departments', label: 'Manage Depts', icon: Building2 },
  { href: '/admin/quizzes', label: 'Generate Quiz', icon: BrainCircuit },
]

const adminOnlyItems = [{ href: '/admin/users', label: 'Users', icon: Users }]

function NavItem({
  href,
  label,
  icon: Icon,
  isActive,
  collapsed,
}: {
  href: string
  label: string
  icon: React.ElementType
  isActive: boolean
  collapsed: boolean
}) {
  const link = (
    <Link
      href={href}
      className={cn(
        'group relative flex items-center gap-3 px-3 py-2 text-sm rounded-[6px] transition-all duration-200',
        collapsed && 'justify-center px-2',
        isActive
          ? 'bg-linear-to-r from-amber/12 to-transparent text-amber font-medium'
          : 'text-text-muted hover:text-foreground hover:bg-muted',
      )}
    >
      <span
        className={cn(
          'absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-linear-to-b from-amber/0 via-amber to-amber/0 transition-opacity duration-200',
          collapsed && 'hidden',
          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-25',
        )}
      />
      <Icon
        className={cn(
          'size-4 shrink-0 transition-colors duration-200',
          isActive ? 'text-amber' : 'text-text-muted group-hover:text-foreground',
        )}
        strokeWidth={1.5}
      />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    )
  }

  return link
}

export function AppSidebar() {
  const pathname = usePathname()
  const params = useParams()
  const router = useRouter()
  const { session } = useAuth()
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const toggle = useUIStore((s) => s.toggleSidebar)
  const user = session?.user
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  // Track which labeled groups are open (default all open)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Content: true,
    Explore: true,
    Admin: true,
  })

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR'
  const isSuperAdmin = user?.role === 'ADMIN'

  const { data: userUniversity } = useUniversitiesControllerFindOne(user?.universityId ?? '', {
    query: { select: (r) => r.data, enabled: !!user?.universityId },
  })
  const groups = user ? authNavGroups : [{ label: null, items: publicNavItems }]
  const isChat = pathname.startsWith('/chat')
  const selectedRoomId = isChat ? (params?.roomId as string | undefined) : undefined

  function toggleGroup(label: string) {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  async function handleSignOut() {
    await authClient.signOut()
    router.replace('/login')
  }

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        animate={{ width: collapsed ? 64 : 288 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="hidden md:flex flex-col h-screen border-r border-border bg-background fixed left-0 top-0 z-30 overflow-hidden"
      >
        {/* Logo row */}
        <div
          className={cn(
            'flex items-center px-4 py-5',
            collapsed ? 'justify-center' : 'gap-2.5 justify-between',
          )}
        >
          {!collapsed && (
            <Link href="/feed" className="flex items-center gap-2.5 flex-1 min-w-0">
              <Image
                src="/icon.svg"
                alt="Unishare logo"
                width={28}
                height={28}
                loading="eager"
                className="rounded-[6px] shrink-0"
              />
              <span className="font-mono text-[15px] font-bold tracking-tight text-foreground truncate">
                Unishare
              </span>
              {userUniversity?.logoUrl && (
                <>
                  <span className="text-border mx-0.5 select-none">|</span>
                  <Image
                    src={userUniversity.logoUrl}
                    alt={userUniversity.shortName}
                    width={42}
                    height={42}
                    className="shrink-0 object-contain"
                    title={userUniversity.name}
                  />
                </>
              )}
            </Link>
          )}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggle}
                  className="p-1.5 rounded-[6px] text-text-muted hover:text-foreground hover:bg-muted transition-colors"
                >
                  <PanelLeft className="size-4" strokeWidth={1.5} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Expand sidebar</TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={toggle}
              className="shrink-0 p-1.5 rounded-[6px] text-text-muted hover:text-foreground hover:bg-muted transition-colors"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="size-4" strokeWidth={1.5} />
            </button>
          )}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {isChat && !collapsed ? (
            <motion.div
              key="chat-sidebar"
              className="flex-1 flex flex-col overflow-hidden"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <div className="px-3 py-2 border-b">
                <Link
                  href="/feed"
                  className="flex items-center gap-2 px-2 py-1.5 text-sm text-text-muted hover:text-foreground hover:bg-muted rounded-[6px] transition-all duration-200"
                >
                  <ChevronLeft className="size-4 shrink-0" strokeWidth={1.5} />
                  Back
                </Link>
              </div>
              <div className="flex-1 overflow-hidden flex flex-col">
                <ChatSidebar selectedRoomId={selectedRoomId} />
              </div>
            </motion.div>
          ) : (
            <motion.nav
              key="main-nav"
              className={cn(
                'flex flex-col gap-0.5 flex-1 overflow-y-auto',
                collapsed ? 'px-2' : 'px-3',
              )}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {groups.map((group, gi) => {
                const isOpen = !group.label || collapsed || openGroups[group.label] !== false
                return (
                  <div key={gi} className={gi > 0 ? 'mt-3' : ''}>
                    {group.label && !collapsed && (
                      <button
                        onClick={() => toggleGroup(group.label!)}
                        className="w-full flex items-center justify-between px-3 py-1 mb-0.5 group"
                      >
                        <span className="font-mono text-[11px] uppercase tracking-wider text-text-muted group-hover:text-foreground transition-colors">
                          {group.label}
                        </span>
                        <ChevronDown
                          className={cn(
                            'size-3 text-text-muted transition-transform duration-200',
                            !isOpen && '-rotate-90',
                          )}
                          strokeWidth={1.5}
                        />
                      </button>
                    )}
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.18, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          {group.items.map((item) => (
                            <NavItem
                              key={item.href}
                              href={item.href}
                              label={item.label}
                              icon={item.icon}
                              isActive={pathname.startsWith(item.href)}
                              collapsed={collapsed}
                            />
                          ))}
                          {gi === 0 && user && <NotificationsBell collapsed={collapsed} />}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}

              {isAdmin && (
                <div className="mt-3">
                  {!collapsed && (
                    <button
                      onClick={() => toggleGroup('Admin')}
                      className="w-full flex items-center justify-between px-3 py-1 mb-0.5 group"
                    >
                      <span className="font-mono text-[11px] uppercase tracking-wider text-text-muted group-hover:text-foreground transition-colors">
                        Admin
                      </span>
                      <ChevronDown
                        className={cn(
                          'size-3 text-text-muted transition-transform duration-200',
                          !openGroups['Admin'] && '-rotate-90',
                        )}
                        strokeWidth={1.5}
                      />
                    </button>
                  )}
                  <AnimatePresence initial={false}>
                    {(collapsed || openGroups['Admin'] !== false) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        {[...adminItems, ...(isSuperAdmin ? adminOnlyItems : [])].map((item) => (
                          <NavItem
                            key={item.href}
                            href={item.href}
                            label={item.label}
                            icon={item.icon}
                            isActive={pathname.startsWith(item.href)}
                            collapsed={collapsed}
                          />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.nav>
          )}
        </AnimatePresence>

        {!collapsed && (
          <>
            {!isChat && (
              <div className="px-4 py-2">
                <a
                  href="https://github.com/unishare-oss/unishare"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-text-muted hover:text-foreground rounded-[6px] hover:bg-muted transition-all duration-150"
                >
                  <GitFork className="size-3.5 shrink-0" strokeWidth={1.5} />
                  Open source · Contribute
                </a>
                <button
                  onClick={() => setFeedbackOpen(true)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-muted hover:text-foreground rounded-[6px] hover:bg-muted transition-all duration-150"
                >
                  <MessageSquareHeart className="size-3.5 shrink-0" strokeWidth={1.5} />
                  Feedback or bug report
                </button>
              </div>
            )}

            <div className="border-t border-border px-4 py-4">
              {user ? (
                <div className="flex items-center gap-3">
                  <Link href="/profile" className="flex items-center gap-3 flex-1 min-w-0 group">
                    <UserAvatar name={user.name ?? 'User'} image={user.image} size="md" priority />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                      <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
                        {user.role}
                      </p>
                    </div>
                    <Settings
                      className="size-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                      strokeWidth={1.5}
                    />
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleSignOut}
                    aria-label="Sign out"
                    className="shrink-0 text-text-muted hover:bg-red-100 rounded-2xl"
                  >
                    <LogOut className="size-4" strokeWidth={1.5} />
                  </Button>
                  <Link href="/profile#appearance">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Change theme"
                      className="shrink-0 text-text-muted rounded-2xl"
                    >
                      <Palette className="size-4" strokeWidth={1.5} />
                    </Button>
                  </Link>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-3 px-3 py-2 text-sm rounded-[6px] text-text-muted hover:text-foreground hover:bg-muted transition-all duration-200"
                >
                  <LogIn className="size-4" strokeWidth={1.5} />
                  Sign in
                </Link>
              )}
            </div>
          </>
        )}

        {collapsed && user && (
          <div className="border-t border-border py-4 flex flex-col items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/profile">
                  <UserAvatar name={user.name ?? 'User'} image={user.image} size="md" priority />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{user.name}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleSignOut}
                  aria-label="Sign out"
                  className="text-text-muted hover:bg-red-100 rounded-2xl"
                >
                  <LogOut className="size-4" strokeWidth={1.5} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Sign out</TooltipContent>
            </Tooltip>
          </div>
        )}

        <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
      </motion.aside>
    </TooltipProvider>
  )
}
