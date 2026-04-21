'use client'

import { useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Separator } from '@/components/ui/separator'
import { Camera, Search, Users, UserPlus, Loader2 } from 'lucide-react'
import { storageControllerGetPresignedUploadUrl } from '@/src/lib/api/generated/storage/storage'
import {
  PresignedUploadDtoPurpose,
  PresignedUploadDtoUploadType,
  type PresignedUploadEntity,
} from '@/src/lib/api/generated/unishareAPI.schemas'
import { useNetworkUsers } from '@/hooks/use-network-users'
import { useCreateGroup, useInviteMembers } from '@/hooks/use-chat-mutations'
import { UserRow, SelectedBadge } from '@/components/chat/group-chat-user-row'
import { useAuth } from '@/contexts/auth-context'
import { useCrypto } from '@/hooks/use-crypto'

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
  const { session, user: currentUser } = useAuth()
  const currentUserId = session?.user?.id
  const { hasRoomKey, encryptRoomKeyForUser, createEncryptedRoomKeys } = useCrypto()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(defaultParticipantIds))
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imagePublicUrl, setImagePublicUrl] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImagePreview(URL.createObjectURL(file))
    setIsUploadingImage(true)
    try {
      const res = await storageControllerGetPresignedUploadUrl({
        mimeType: file.type,
        uploadType: PresignedUploadDtoUploadType.image,
        purpose: PresignedUploadDtoPurpose['group-picture'],
      })
      const { url, publicUrl } = res.data as PresignedUploadEntity
      await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
      setImagePublicUrl(publicUrl)
    } catch {
      setImagePreview(null)
      setImagePublicUrl(null)
    } finally {
      setIsUploadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleClose = () => {
    form.reset({ name: defaultName })
    setSearchQuery('')
    setSelectedIds(new Set(defaultParticipantIds))
    setImagePreview(null)
    setImagePublicUrl(null)
    onOpenChange(false)
  }

  const canSubmit = selectedIds.size >= 1

  const onSubmit = async (values: CreateGroupValues) => {
    if (!canSubmit) return
    try {
      if (mode === 'invite') {
        let encryptedRoomKeys: { userId: string; encryptedKey: string }[] | undefined

        if (roomId && hasRoomKey(roomId)) {
          const results = await Promise.all(
            Array.from(selectedIds).map(async (id) => {
              //TODO: maybe add key in selectedId?
              const member = networkUsers.find((u) => u.id === id)
              if (!member?.publicKey) return null
              const encryptedKey = await encryptRoomKeyForUser(roomId, member.publicKey)
              return { userId: id, encryptedKey }
            }),
          )

          console.log(results)
          if (results.every((r) => r !== null)) {
            encryptedRoomKeys = results as { userId: string; encryptedKey: string }[]
          }
        }

        await inviteMembers({
          id: roomId!,
          data: { userIds: Array.from(selectedIds), encryptedRoomKeys },
        })
        handleClose()
        return
      }

      // Build encrypted room keys for all participants if everyone has a public key
      let encryptedRoomKeys: { userId: string; encryptedKey: string }[] | undefined
      const allParticipants = [
        { id: currentUserId, publicKey: currentUser?.publicKey },
        ...Array.from(selectedIds).map((id) => ({
          id,
          publicKey: networkUsers.find((u) => u.id === id)?.publicKey,
        })),
      ]
      if (allParticipants.every((p) => p.id && p.publicKey)) {
        encryptedRoomKeys = await createEncryptedRoomKeys(
          allParticipants.map((p) => ({ userId: p.id!, publicKeyJwk: p.publicKey! })),
        )
      }

      const response = await createGroup({
        data: {
          type: 'GROUP',
          name: values.name.trim(),
          participantIds: Array.from(selectedIds),
          ...(imagePublicUrl && { imageUrl: imagePublicUrl }),
          encryptedRoomKeys,
        },
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
              {/* Avatar picker — create mode only */}
              {mode === 'create' && (
                <div className="flex items-center gap-4">
                  <div className="relative group shrink-0">
                    <Avatar className="h-14 w-14 rounded-[8px] border-2 border-border">
                      <AvatarImage src={imagePreview || ''} />
                      <AvatarFallback className="rounded-[8px] bg-muted text-muted-foreground">
                        {isUploadingImage ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Users className="size-5" strokeWidth={1.5} />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingImage}
                      className="absolute inset-0 w-full h-full rounded-[8px] bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity disabled:cursor-wait"
                      aria-label="Upload group photo"
                    >
                      <Camera className="size-4 text-white" strokeWidth={1.5} />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Optional group photo.
                    <br />
                    JPEG, PNG or WebP.
                  </p>
                </div>
              )}

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
