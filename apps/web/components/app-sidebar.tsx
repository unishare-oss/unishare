'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutList, FileText, Bookmark, Building2, ShieldCheck, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UserAvatar } from '@/components/shared/user-avatar'
import { currentUser } from '@/lib/mock-data'

const navItems = [
  { href: '/', label: 'Feed', icon: LayoutList },
  { href: '/my-posts', label: 'My Posts', icon: FileText },
  { href: '/saved', label: 'Saved', icon: Bookmark },
  { href: '/departments', label: 'Departments', icon: Building2 },
]

const adminItems = [
  { href: '/admin/moderation', label: 'Moderation', icon: ShieldCheck },
  { href: '/admin/departments', label: 'Manage Depts', icon: Building2 },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col w-60 min-h-screen border-r border-border bg-background fixed left-0 top-0 z-30">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex items-center justify-center w-7 h-7 rounded-[6px] bg-amber text-primary-foreground font-mono text-xs font-bold">
          U
        </div>
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

        <div className="mt-6 mb-2 px-3">
          <span className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
            Admin
          </span>
        </div>
        {adminItems.map((item) => {
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
      </nav>

      <div className="border-t border-border px-4 py-4">
        <Link href="/profile" className="flex items-center gap-3 group">
          <UserAvatar name={currentUser.name} size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{currentUser.name}</p>
            <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
              {currentUser.role}
            </p>
          </div>
          <Settings
            className="size-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity duration-150"
            strokeWidth={1.5}
          />
        </Link>
      </div>
    </aside>
  )
}
