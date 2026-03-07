'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { authClient } from '@/src/lib/auth/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type Role = 'STUDENT' | 'MODERATOR' | 'ADMIN'

const ROLES: Role[] = ['STUDENT', 'MODERATOR', 'ADMIN']

const roleBadgeClass: Record<Role, string> = {
  STUDENT: 'text-text-muted',
  MODERATOR: 'text-blue-400',
  ADMIN: 'text-amber',
}

type User = NonNullable<
  Awaited<ReturnType<typeof authClient.admin.listUsers>>['data']
>['users'][number]

export function UsersTable({ users, onRefresh }: { users: User[]; onRefresh: () => void }) {
  const [loadingId, setLoadingId] = useState<string | null>(null)

  async function handleSetRole(userId: string, role: Role) {
    setLoadingId(userId)
    await authClient.admin.setRole({ userId, role })
    onRefresh()
    setLoadingId(null)
  }

  async function handleBan(userId: string) {
    setLoadingId(userId)
    await authClient.admin.banUser({ userId })
    onRefresh()
    setLoadingId(null)
  }

  async function handleUnban(userId: string) {
    setLoadingId(userId)
    await authClient.admin.unbanUser({ userId })
    onRefresh()
    setLoadingId(null)
  }

  return (
    <div className="flex-1 bg-card">
      {users.map((user) => {
        const role = (user.role ?? 'STUDENT') as Role
        const isBanned = user.banned === true
        const isLoading = loadingId === user.id

        return (
          <div key={user.id} className="border-b border-border">
            <div className="relative flex items-center gap-4 pl-6 pr-6 py-4 hover:bg-muted transition-colors duration-150 group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className={cn(
                      'text-sm font-medium truncate',
                      isBanned ? 'text-text-muted line-through' : 'text-foreground',
                    )}
                  >
                    {user.name ?? '—'}
                  </p>
                  {isBanned && (
                    <span className="font-mono text-[10px] uppercase tracking-wider text-destructive border border-destructive/30 px-1.5 py-0.5 rounded-[4px]">
                      Banned
                    </span>
                  )}
                </div>
                <p className="font-mono text-xs text-text-muted truncate">{user.email}</p>
              </div>

              <div className="hidden sm:block shrink-0 w-24">
                <p
                  className={cn(
                    'font-mono text-xs uppercase tracking-wider',
                    roleBadgeClass[role] ?? 'text-text-muted',
                  )}
                >
                  {user.role}
                </p>
              </div>

              <div className="hidden md:block shrink-0 w-28">
                <p className="font-mono text-xs text-text-muted">
                  {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                </p>
              </div>

              <div className="shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isLoading}
                      className="opacity-0 group-hover:opacity-100 transition-opacity font-mono text-xs uppercase tracking-wider text-text-muted"
                    >
                      {isLoading ? 'Saving...' : 'Actions'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[140px]">
                    <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
                      Change Role
                    </DropdownMenuLabel>
                    {ROLES.filter((r) => r !== role).map((r) => (
                      <DropdownMenuItem
                        key={r}
                        onClick={() => handleSetRole(user.id, r)}
                        className={cn(
                          'font-mono text-xs uppercase tracking-wider',
                          roleBadgeClass[r],
                        )}
                      >
                        {r}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    {isBanned ? (
                      <DropdownMenuItem
                        onClick={() => handleUnban(user.id)}
                        className="font-mono text-xs uppercase tracking-wider text-success"
                      >
                        Unban
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={() => handleBan(user.id)}
                        className="font-mono text-xs uppercase tracking-wider text-destructive"
                      >
                        Ban
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
