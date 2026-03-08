'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutList,
  FileText,
  Bookmark,
  Building2,
  ShieldCheck,
  Settings,
  LogOut,
  LogIn,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { UserAvatar } from '@/components/shared/user-avatar'
import { authClient } from '@/src/lib/auth/client'
import { Button } from '@/components/ui/button'
import { NotificationsBell } from '@/components/notifications/notifications-bell'

const publicNavItems = [
  { href: '/', label: 'Feed', icon: LayoutList },
  { href: '/saved', label: 'Saved', icon: Bookmark },
  { href: '/departments', label: 'Departments', icon: Building2 },
]

const authNavItems = [
  { href: '/', label: 'Feed', icon: LayoutList },
  { href: '/my-posts', label: 'My Posts', icon: FileText },
  { href: '/saved', label: 'Saved', icon: Bookmark },
  { href: '/departments', label: 'Departments', icon: Building2 },
]

const adminItems = [
  { href: '/admin/moderation', label: 'Moderation', icon: ShieldCheck },
  { href: '/admin/departments', label: 'Manage Depts', icon: Building2 },
]

const adminOnlyItems = [{ href: '/admin/users', label: 'Users', icon: Users }]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const user = session?.user

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR'
  const isSuperAdmin = user?.role === 'ADMIN'
  const navItems = user ? authNavItems : publicNavItems

  async function handleSignOut() {
    await authClient.signOut()
    router.replace('/login')
  }

  return (
    <aside className="hidden md:flex flex-col w-60 min-h-screen border-r border-border bg-background fixed left-0 top-0 z-30">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <Image
          src="/icon.svg"
          alt="Unishare logo"
          width={28}
          height={28}
          className="rounded-[6px]"
        />
        <span className="font-mono text-[15px] font-bold tracking-tight text-foreground">
          Unishare
        </span>
      </div>

      <nav className="flex flex-col gap-0.5 px-3 flex-1">
        {navItems.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group relative flex items-center gap-3 px-3 py-2 text-sm rounded-[6px] transition-all duration-200',
                isActive
                  ? 'bg-gradient-to-r from-amber/[0.12] to-transparent text-amber font-medium'
                  : 'text-text-muted hover:text-foreground hover:bg-muted',
              )}
            >
              <span
                className={cn(
                  'absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-gradient-to-b from-amber/0 via-amber to-amber/0 transition-opacity duration-200',
                  isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-25',
                )}
              />
              <item.icon
                className={cn(
                  'size-4 transition-colors duration-200',
                  isActive ? 'text-amber' : 'text-text-muted group-hover:text-foreground',
                )}
                strokeWidth={1.5}
              />
              {item.label}
            </Link>
          )
        })}

        {user && <NotificationsBell />}

        {isAdmin && (
          <>
            <div className="mt-6 mb-2 px-3">
              <span className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
                Admin
              </span>
            </div>
            {[...adminItems, ...(isSuperAdmin ? adminOnlyItems : [])].map((item) => {
              const isActive = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group relative flex items-center gap-3 px-3 py-2 text-sm rounded-[6px] transition-all duration-200',
                    isActive
                      ? 'bg-gradient-to-r from-amber/[0.12] to-transparent text-amber font-medium'
                      : 'text-text-muted hover:text-foreground hover:bg-muted',
                  )}
                >
                  <span
                    className={cn(
                      'absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-gradient-to-b from-amber/0 via-amber to-amber/0 transition-opacity duration-200',
                      isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-25',
                    )}
                  />
                  <item.icon
                    className={cn(
                      'size-4 transition-colors duration-200',
                      isActive ? 'text-amber' : 'text-text-muted group-hover:text-foreground',
                    )}
                    strokeWidth={1.5}
                  />
                  {item.label}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      <div className="border-t border-border px-4 py-4">
        {user ? (
          <div className="flex items-center gap-3">
            <Link href="/profile" className="flex items-center gap-3 flex-1 min-w-0 group">
              <UserAvatar name={user.name ?? 'User'} image={user.image} size="md" />
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
    </aside>
  )
}
