'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Separator } from '@/components/ui/separator'
import { Search, Users, UserPlus, Loader2 } from 'lucide-react'
import { useNetworkUsers } from '@/hooks/use-network-users'
import { useCreateGroup, useInviteMembers } from '@/hooks/use-chat-mutations'
import { UserRow, SelectedBadge } from '@/components/chat/group-chat-user-row'

const GROUP_NAME_MAX = 30

const createGroupSchema = z.object({
  name: z
    .string()
    .min(1, 'Group name is required')
    .max(GROUP_NAME_MAX, `Max ${GROUP_NAME_MAX} characters`),
})

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

type CreateGroupValues = z.infer<typeof createGroupSchema>

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
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(defaultParticipantIds))

  const form = useForm<CreateGroupValues>({
    resolver: mode === 'create' ? zodResolver(createGroupSchema) : undefined, //in edit, we don't ue this form
    defaultValues: { name: defaultName },
  })

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

  const handleClose = () => {
    form.reset({ name: defaultName })
    setSearchQuery('')
    setSelectedIds(new Set(defaultParticipantIds))
    onOpenChange(false)
  }

  const canSubmit = selectedIds.size >= 1

  const onSubmit = async (values: CreateGroupValues) => {
    if (!canSubmit) return
    try {
      if (mode === 'invite') {
        await inviteMembers({ id: roomId!, data: { userIds: Array.from(selectedIds) } })
        handleClose()
        return
      }
      const response = await createGroup({
        data: { type: 'GROUP', name: values.name.trim(), participantIds: Array.from(selectedIds) },
      })
      handleClose()
      router.push(`/chat/${response.data.id}`)
    } catch (err) {
      console.error(`Failed to ${mode === 'create' ? 'create group' : 'invite members'}:`, err)
    }
  }

  const title = mode === 'create' ? 'New Group Chat' : 'Invite Members'
  const TitleIcon = mode === 'create' ? Users : UserPlus
  const submitLabel = mode === 'create' ? 'Create Group' : 'Invite'
  const submittingLabel = mode === 'create' ? 'Creating…' : 'Inviting…'

  const nameValue = form.watch('name') ?? ''

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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-4 p-5">
              {/* Group name — create mode only */}
              {mode === 'create' && (
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="gap-1.5">
                      <FormLabel className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                        Group Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Study Group, Project Team…"
                          className="h-9"
                          maxLength={GROUP_NAME_MAX}
                          {...field}
                        />
                      </FormControl>
                      <div className="flex items-center justify-between">
                        <FormMessage className="text-xs" />
                        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                          {nameValue.length}/{GROUP_NAME_MAX}
                        </span>
                      </div>
                    </FormItem>
                  )}
                />
              )}

              {/* Member search */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                  {mode === 'create' ? 'Add Members' : 'Select Members'}
                </span>
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
                    <SelectedBadge key={u.id} user={u} onRemove={toggleUser} />
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
                    {filteredUsers.map((u) => (
                      <UserRow
                        key={u.id}
                        user={u}
                        selected={selectedIds.has(u.id)}
                        onToggle={toggleUser}
                      />
                    ))}
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
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={!canSubmit || isPending}>
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
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
