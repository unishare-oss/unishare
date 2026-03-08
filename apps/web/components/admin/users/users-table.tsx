'use client'

import { useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { CalendarIcon, ChevronDown, ChevronRight } from 'lucide-react'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'

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

interface DeleteDialogState {
  userId: string
  name: string
}

type BanPreset = 'permanent' | '1h' | '1d' | '1w' | '1m' | 'custom'

const BAN_PRESETS: { value: BanPreset; label: string; seconds?: number }[] = [
  { value: 'permanent', label: 'Permanent' },
  { value: '1h', label: '1 Hour', seconds: 3600 },
  { value: '1d', label: '1 Day', seconds: 86400 },
  { value: '1w', label: '1 Week', seconds: 604800 },
  { value: '1m', label: '1 Month', seconds: 2592000 },
]

export function UsersTable({ users, onRefresh }: { users: User[]; onRefresh: () => void }) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [banDialog, setBanDialog] = useState<BanDialogState | null>(null)
  const [banReason, setBanReason] = useState('')
  const [banPreset, setBanPreset] = useState<BanPreset>('permanent')
  const [customDate, setCustomDate] = useState<Date | undefined>()
  const [calendarOpen, setCalendarOpen] = useState(false)

  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState | null>(null)

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

    let banExpiresIn: number | undefined
    if (banPreset === 'custom' && customDate) {
      banExpiresIn = Math.floor((customDate.getTime() - Date.now()) / 1000)
    } else {
      const preset = BAN_PRESETS.find((p) => p.value === banPreset)
      banExpiresIn = preset?.seconds
    }

    await authClient.admin.banUser({
      userId: banDialog.userId,
      banReason: banReason || undefined,
      banExpiresIn,
    })

    setBanReason('')
    setBanPreset('permanent')
    setCustomDate(undefined)
    onRefresh()
    setLoadingId(null)
  }

  async function handleUnban(userId: string) {
    setLoadingId(userId)
    await authClient.admin.unbanUser({ userId })
    onRefresh()
    setLoadingId(null)
  }

  async function handleDeleteConfirm() {
    if (!deleteDialog) return
    setLoadingId(deleteDialog.userId)
    setDeleteDialog(null)
    await authClient.admin.removeUser({ userId: deleteDialog.userId })
    onRefresh()
    setLoadingId(null)
  }

  function openBanDialog(user: User) {
    setBanDialog({ userId: user.id, name: user.name ?? user.email })
    setBanReason('')
    setBanPreset('permanent')
    setCustomDate(undefined)
  }

  return (
    <>
      {/* Ban Dialog */}
      <Dialog
        open={!!banDialog}
        onOpenChange={(open) => {
          if (!open) setBanDialog(null)
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
            <div className="flex flex-col gap-2">
              <Label className="font-mono text-xs uppercase tracking-wider text-text-muted">
                Duration
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {BAN_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setBanPreset(p.value)}
                    className={cn(
                      'px-3 py-1.5 font-mono text-xs uppercase tracking-wider rounded-[6px] border transition-colors',
                      banPreset === p.value
                        ? 'bg-destructive/10 border-destructive/50 text-destructive'
                        : 'border-border text-text-muted hover:text-foreground hover:bg-muted',
                    )}
                  >
                    {p.label}
                  </button>
                ))}
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setBanPreset('custom')}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs uppercase tracking-wider rounded-[6px] border transition-colors',
                        banPreset === 'custom'
                          ? 'bg-destructive/10 border-destructive/50 text-destructive'
                          : 'border-border text-text-muted hover:text-foreground hover:bg-muted',
                      )}
                    >
                      <CalendarIcon className="size-3" />
                      {banPreset === 'custom' && customDate
                        ? format(customDate, 'MMM d')
                        : 'Custom'}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customDate}
                      onSelect={(d) => {
                        setCustomDate(d)
                        setCalendarOpen(false)
                      }}
                      disabled={(d) => d <= new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
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

      {/* Delete Dialog */}
      <Dialog
        open={!!deleteDialog}
        onOpenChange={(open) => {
          if (!open) setDeleteDialog(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteDialog?.name}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-muted">
            This will permanently delete this account and all associated data. This action cannot be
            undone.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteDialog(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex-1 bg-card">
        <div className="flex items-center gap-4 pl-11 pr-6 py-2 border-b border-border bg-muted/50">
          <div className="flex-1 font-mono text-[10px] uppercase tracking-wider text-text-muted">
            User
          </div>
          <div className="hidden sm:block shrink-0 w-24 font-mono text-[10px] uppercase tracking-wider text-text-muted">
            Role
          </div>
          <div className="hidden md:block shrink-0 w-28 font-mono text-[10px] uppercase tracking-wider text-text-muted">
            Joined
          </div>
          <div className="shrink-0 w-[72px]" />
        </div>

        {users.map((user) => {
          const role = (user.role ?? 'STUDENT') as Role
          const isBanned = user.banned === true
          const isLoading = loadingId === user.id
          const isExpanded = expandedId === user.id

          return (
            <div key={user.id} className="border-b border-border">
              <div
                className="relative flex items-center gap-4 pl-4 pr-6 py-4 hover:bg-muted transition-colors duration-150 group cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : user.id)}
              >
                <div className="shrink-0 w-5 flex items-center justify-center">
                  {isExpanded ? (
                    <ChevronDown className="size-3 text-text-muted" />
                  ) : (
                    <ChevronRight className="size-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>

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
                  {isBanned && (user.banReason || user.banExpires) && (
                    <p className="font-mono text-[11px] text-destructive/70 mt-0.5 truncate">
                      {user.banReason && `"${user.banReason}"`}
                      {user.banReason && user.banExpires && ' · '}
                      {user.banExpires && `Until ${new Date(user.banExpires).toLocaleDateString()}`}
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

                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
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
                    <DropdownMenuContent align="end" className="min-w-[150px]">
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
                          onClick={() => openBanDialog(user)}
                          className="font-mono text-xs uppercase tracking-wider text-destructive"
                        >
                          Ban
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() =>
                          setDeleteDialog({ userId: user.id, name: user.name ?? user.email })
                        }
                        className="font-mono text-xs uppercase tracking-wider text-destructive"
                      >
                        Delete account
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {isExpanded && (
                <div className="pl-11 pr-6 pb-4 pt-3 bg-muted/30 border-t border-border/50">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted mb-0.5">
                        User ID
                      </p>
                      <p className="font-mono text-xs text-foreground break-all">{user.id}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted mb-0.5">
                        Email
                      </p>
                      <p className="font-mono text-xs text-foreground break-all">{user.email}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted mb-0.5">
                        Joined
                      </p>
                      <p className="font-mono text-xs text-foreground">
                        {format(new Date(user.createdAt), 'PPP')}
                      </p>
                    </div>
                    {isBanned && (
                      <>
                        {user.banReason && (
                          <div>
                            <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted mb-0.5">
                              Ban Reason
                            </p>
                            <p className="font-mono text-xs text-destructive">{user.banReason}</p>
                          </div>
                        )}
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted mb-0.5">
                            Ban Expires
                          </p>
                          <p className="font-mono text-xs text-destructive">
                            {user.banExpires
                              ? format(new Date(user.banExpires), 'PPP')
                              : 'Permanent'}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
