'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutList,
  FileText,
  Bookmark,
  LogIn,
  Bell,
  LayoutGrid,
  MessageSquare,
  MessageSquarePlus,
  Building2,
  BarChart2,
  MoreHorizontal,
  LogOut,
  Settings,
  MessageSquareHeart,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/auth-context'
import { useNotificationsControllerFindAll } from '@/src/lib/api/generated/notifications/notifications'
import { useState } from 'react'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { authClient } from '@/src/lib/auth/client'
import { UserAvatar } from '@/components/shared/user-avatar'
import { FeedbackDialog } from '@/components/feedback/feedback-dialog'
import { Button } from '@/components/ui/button'

const guestTabs = [
  { href: '/feed', label: 'Feed', icon: LayoutList },
  { href: '/saved', label: 'Saved', icon: Bookmark },
  { href: '/login', label: 'Sign In', icon: LogIn },
]

const primaryAuthTabs = [
  { href: '/feed', label: 'Feed', icon: LayoutList },
  { href: '/chat', label: 'Chat', icon: MessageSquare },
  { href: '/my-posts', label: 'Posts', icon: FileText },
  { href: '/notifications', label: 'Notifs', icon: Bell },
]

const moreAuthItems = [
  { href: '/boards', label: 'Boards', icon: LayoutGrid },
  { href: '/saved', label: 'Saved', icon: Bookmark },
  { href: '/requests', label: 'Requests', icon: MessageSquarePlus },
  { href: '/departments', label: 'Departments', icon: Building2 },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/profile', label: 'Settings', icon: Settings },
]

export function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { isAuthenticated, session } = useAuth()
  const user = session?.user
  const tabs = isAuthenticated ? primaryAuthTabs : guestTabs

  const { data: notifications } = useNotificationsControllerFindAll({
    query: { select: (r) => r.data, enabled: isAuthenticated, staleTime: 1000 * 60 },
  })
  const unreadCount = (notifications ?? []).filter((n) => !n.read).length

  const isMoreActive =
    isAuthenticated && moreAuthItems.some((item) => pathname.startsWith(item.href))

  const [sheetOpen, setSheetOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  async function handleSignOut() {
    await authClient.signOut()
    router.replace('/login')
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border">
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href)
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

        {isAuthenticated && (
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button
                className={cn(
                  'relative flex flex-col items-center gap-1 px-3 py-1.5 transition-colors duration-200',
                  isMoreActive ? 'text-amber' : 'text-text-muted',
                )}
              >
                <span
                  className={cn(
                    'absolute top-0 left-1/2 -translate-x-1/2 h-[2px] rounded-full bg-gradient-to-r from-amber/0 via-amber to-amber/0 transition-all duration-200',
                    isMoreActive ? 'w-8 opacity-100' : 'w-0 opacity-0',
                  )}
                />
                <MoreHorizontal className="size-5" strokeWidth={1.5} />
                <span className="text-[10px] font-mono uppercase tracking-wider">More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl px-0 pb-4">
              <SheetTitle className="px-5 pt-1 pb-3 text-sm font-mono uppercase tracking-widest text-muted-foreground">
                More
              </SheetTitle>

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
                          ? 'bg-amber/10 text-amber'
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
            </SheetContent>
          </Sheet>
        )}
      </div>

      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </nav>
  )
}
