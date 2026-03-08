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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

type Role = 'STUDENT' | 'MODERATOR' | 'ADMIN'

const ROLES: Role[] = ['STUDENT', 'MODERATOR', 'ADMIN']

const roleBadgeClass: Record<Role, string> = {
  STUDENT: 'text-text-muted',
  MODERATOR: 'text-blue-400',
  ADMIN: 'text-amber',
}

type BaseUser = NonNullable<
  Awaited<ReturnType<typeof authClient.admin.listUsers>>['data']
>['users'][number]

type User = BaseUser & {
  banReason?: string | null
  banExpires?: string | null
}

interface BanDialogState {
  userId: string
  name: string
}

export function UsersTable({ users, onRefresh }: { users: User[]; onRefresh: () => void }) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [banDialog, setBanDialog] = useState<BanDialogState | null>(null)
  const [banReason, setBanReason] = useState('')
  const [banExpires, setBanExpires] = useState('')

  async function handleSetRole(userId: string, role: Role) {
    setLoadingId(userId)
    await authClient.admin.setRole({ userId, role })
    onRefresh()
    setLoadingId(null)
  }

  async function handleBanConfirm() {
    if (!banDialog) return
    setLoadingId(banDialog.userId)
    setBanDialog(null)

    const expiresIn = banExpires
      ? Math.floor((new Date(banExpires).getTime() - Date.now()) / 1000)
      : undefined

    await authClient.admin.banUser({
      userId: banDialog.userId,
      banReason: banReason || undefined,
      banExpiresIn: expiresIn,
    })

    setBanReason('')
    setBanExpires('')
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
    <>
      <Dialog
        open={!!banDialog}
        onOpenChange={(open) => {
          if (!open) {
            setBanDialog(null)
            setBanReason('')
            setBanExpires('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban {banDialog?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="ban-reason"
                className="font-mono text-xs uppercase tracking-wider text-text-muted"
              >
                Reason (optional)
              </Label>
              <Input
                id="ban-reason"
                placeholder="e.g. Spam, inappropriate content..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="ban-expires"
                className="font-mono text-xs uppercase tracking-wider text-text-muted"
              >
                Expires (optional — leave blank for permanent)
              </Label>
              <Input
                id="ban-expires"
                type="datetime-local"
                value={banExpires}
                onChange={(e) => setBanExpires(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBanDialog(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBanConfirm}>
              Ban user
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex-1 bg-card">
        {users.map((user) => {
          const role = (user.role ?? 'STUDENT') as Role
          const isBanned = user.banned === true
          const isLoading = loadingId === user.id
          const banReason = user.banReason
          const banExpires = user.banExpires

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
                  {isBanned && (banReason || banExpires) && (
                    <p className="font-mono text-[11px] text-destructive/70 mt-0.5 truncate">
                      {banReason && `"${banReason}"`}
                      {banReason && banExpires && ' · '}
                      {banExpires && `Until ${new Date(banExpires).toLocaleDateString()}`}
                    </p>
                  )}
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
                          onClick={() =>
                            setBanDialog({ userId: user.id, name: user.name ?? user.email })
                          }
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
    </>
  )
}
