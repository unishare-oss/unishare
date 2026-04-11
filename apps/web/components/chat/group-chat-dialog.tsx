'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Search, X, Users, UserPlus, Loader2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNetworkUsers } from '@/hooks/use-network-users'
import { useCreateGroup, useInviteMembers } from '@/hooks/use-chat-mutations'

interface GroupChatDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // create mode
  mode?: 'create' | 'invite'
  defaultName?: string
  defaultParticipantIds?: string[]
  // invite mode
  roomId?: string
  existingMemberIds?: string[]
}

export function GroupChatDialog({
  open,
  onOpenChange,
  mode = 'create',
  defaultName = '',
  defaultParticipantIds = [],
  roomId,
  existingMemberIds = [],
}: GroupChatDialogProps) {
  const router = useRouter()
  const [groupName, setGroupName] = useState(defaultName)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(defaultParticipantIds))

  const { networkUsers, isLoading } = useNetworkUsers({ enabled: open })
  const { mutateAsync: createGroup, isPending: isCreating } = useCreateGroup()
  const { mutateAsync: inviteMembers, isPending: isInviting } = useInviteMembers(roomId ?? '')

  const isPending = mode === 'create' ? isCreating : isInviting

  // In invite mode filter out users already in the room
  const invitableUsers = useMemo(() => {
    if (mode === 'create') return networkUsers
    const existing = new Set(existingMemberIds)
    return networkUsers.filter((u) => !existing.has(u.id))
  }, [networkUsers, mode, existingMemberIds])

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return invitableUsers
    const q = searchQuery.toLowerCase()
    return invitableUsers.filter((u) => u.name?.toLowerCase().includes(q))
  }, [invitableUsers, searchQuery])

  const selectedUsers = useMemo(
    () => networkUsers.filter((u) => selectedIds.has(u.id)),
    [networkUsers, selectedIds],
  )

  const toggleUser = (userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  const handleSubmit = async () => {
    if (!canSubmit) return
    try {
      if (mode === 'invite') {
        await inviteMembers({ id: roomId!, data: { userIds: Array.from(selectedIds) } })
        handleClose()
        return
      }
      const response = await createGroup({
        data: { type: 'GROUP', name: groupName.trim(), participantIds: Array.from(selectedIds) },
      })
      handleClose()
      router.push(`/chat/${response.data.id}`)
    } catch (err) {
      console.error(`Failed to ${mode === 'create' ? 'create group' : 'invite members'}:`, err)
    }
  }

  const handleClose = () => {
    setGroupName(defaultName)
    setSearchQuery('')
    setSelectedIds(new Set(defaultParticipantIds))
    onOpenChange(false)
  }

  const canSubmit =
    mode === 'create' ? groupName.trim().length > 0 && selectedIds.size >= 1 : selectedIds.size >= 1

  const title = mode === 'create' ? 'New Group Chat' : 'Invite Members'
  const TitleIcon = mode === 'create' ? Users : UserPlus
  const submitLabel = mode === 'create' ? 'Create Group' : 'Invite'
  const submittingLabel = mode === 'create' ? 'Creating…' : 'Inviting…'

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <TitleIcon className="size-4 text-primary" strokeWidth={1.5} />
            {title}
          </DialogTitle>
        </DialogHeader>

        <Separator />

        <div className="flex flex-col gap-4 p-5">
          {/* Group name — create mode only */}
          {mode === 'create' && (
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="group-name"
                className="text-xs font-mono uppercase tracking-widest text-muted-foreground"
              >
                Group Name
              </Label>
              <Input
                id="group-name"
                placeholder="e.g. Study Group, Project Team…"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="h-9"
                maxLength={80}
              />
            </div>
          )}

          {/* Member search */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              {mode === 'create' ? 'Add Members' : 'Select Members'}
            </Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by name…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-8"
              />
            </div>
          </div>

          {/* Selected chips */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedUsers.map((u) => (
                <Badge
                  key={u.id}
                  variant="secondary"
                  className="flex items-center gap-1 pr-1 py-0.5 text-xs font-normal"
                >
                  <Avatar className="h-4 w-4 rounded-[3px]">
                    <AvatarImage src={u.image || ''} />
                    <AvatarFallback className="rounded-none text-[8px] font-mono bg-border">
                      {u.name?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="max-w-[80px] truncate">{u.name}</span>
                  <button
                    onClick={() => toggleUser(u.id)}
                    className="ml-0.5 rounded-sm hover:bg-destructive/20 hover:text-destructive p-0.5 transition-colors"
                    aria-label={`Remove ${u.name}`}
                  >
                    <X className="size-2.5" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* User list */}
          <div className="border rounded-lg overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                {invitableUsers.length === 0
                  ? mode === 'invite'
                    ? 'All your connections are already in this group'
                    : 'No connections found'
                  : 'No users match your search'}
              </p>
            ) : (
              <div className="flex flex-col py-1 max-h-[260px] overflow-y-auto">
                {filteredUsers.map((u) => {
                  const selected = selectedIds.has(u.id)
                  return (
                    <button
                      key={u.id}
                      onClick={() => toggleUser(u.id)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 hover:bg-accent/50 transition-colors text-left w-full',
                        selected && 'bg-primary/5',
                      )}
                    >
                      <Avatar className="h-8 w-8 rounded-[5px] shrink-0">
                        <AvatarImage src={u.image || ''} />
                        <AvatarFallback className="rounded-none text-xs font-mono bg-border text-foreground font-medium">
                          {u.name?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1 text-sm font-medium truncate">{u.name}</span>
                      <div
                        className={cn(
                          'size-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                          selected ? 'bg-primary border-primary' : 'border-muted-foreground/30',
                        )}
                      >
                        {selected && (
                          <Check className="size-3 text-primary-foreground" strokeWidth={2.5} />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-xs text-muted-foreground">
            {selectedIds.size === 0
              ? 'Select at least 1 member'
              : `${selectedIds.size} member${selectedIds.size === 1 ? '' : 's'} selected`}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleClose} disabled={isPending}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={!canSubmit || isPending}>
              {isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  {submittingLabel}
                </>
              ) : (
                submitLabel
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
