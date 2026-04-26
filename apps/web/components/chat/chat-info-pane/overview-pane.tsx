'use client'

import { useState, useRef } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Users,
  ImageIcon,
  FileIcon,
  Link2,
  Info,
  X,
  Search,
  Pencil,
  Camera,
  Check,
  Loader2,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { ChatRoomEntity } from '@/src/lib/api/generated/unishareAPI.schemas'
import {
  useChatControllerUpdateRoom,
  getChatControllerGetRoomQueryKey,
  getChatControllerGetRoomsQueryKey,
} from '@/src/lib/api/generated/chat/chat'
import { storageControllerGetPresignedUploadUrl } from '@/src/lib/api/generated/storage/storage'
import {
  PresignedUploadDtoPurpose,
  PresignedUploadDtoUploadType,
  type PresignedUploadEntity,
  type UpdateChatRoomDto,
} from '@/src/lib/api/generated/unishareAPI.schemas'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { SectionRow } from './section-row'
import type { PaneView } from './types'

interface OverviewPaneProps {
  room?: ChatRoomEntity
  displayName: string
  displayImage: string
  isLoading: boolean
  searchQuery: string
  onSearchChange: (q: string) => void
  membersCount: number
  photosCount: number
  filesCount: number
  linksCount: number
  photosPreviews: string[]
  onNavigate: (view: PaneView) => void
  onClose?: () => void
  currentUserId?: string
}

export function OverviewPane({
  room,
  displayName,
  displayImage,
  isLoading,
  searchQuery,
  onSearchChange,
  membersCount,
  photosCount,
  filesCount,
  linksCount,
  photosPreviews,
  onNavigate,
  onClose,
  currentUserId,
}: OverviewPaneProps) {
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const queryClient = useQueryClient()
  const { mutate: updateRoom, isPending: isUpdatingRoom } = useChatControllerUpdateRoom({
    mutation: {
      onSuccess: () => {
        if (room) {
          queryClient.invalidateQueries({ queryKey: getChatControllerGetRoomQueryKey(room.id) })
          queryClient.invalidateQueries({ queryKey: getChatControllerGetRoomsQueryKey() })
        }
      },
      onError: () => toast.error('Failed to update room'),
    },
  })

  // Determine owner: participant with earliest joinedAt
  const isOwner =
    room?.type === 'GROUP' &&
    currentUserId &&
    room.participants?.length > 0 &&
    room.participants.reduce((earliest, p) =>
      new Date(p.joinedAt) < new Date(earliest.joinedAt) ? p : earliest,
    ).userId === currentUserId

  const startEditName = () => {
    setNameValue(room?.name ?? '')
    setEditingName(true)
  }

  const saveName = () => {
    if (!room || !nameValue.trim()) return
    updateRoom({ id: room.id, data: { name: nameValue.trim() } })
    setEditingName(false)
  }

  const cancelEdit = () => setEditingName(false)

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !room) return
    setIsUploadingImage(true)
    try {
      const res = await storageControllerGetPresignedUploadUrl({
        mimeType: file.type,
        uploadType: PresignedUploadDtoUploadType.image,
        purpose: PresignedUploadDtoPurpose['group-picture'],
      })
      const { url, publicUrl } = res.data as PresignedUploadEntity
      await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
      updateRoom({ id: room.id, data: { imageUrl: publicUrl } })
    } catch {
      toast.error('Failed to upload image')
    } finally {
      setIsUploadingImage(false)
      if (imageInputRef.current) imageInputRef.current.value = ''
    }
  }

  const isBusy = isUploadingImage || isUpdatingRoom

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 min-h-0">
        <div className="flex flex-col w-full md:w-64">
          {/* Search */}
          <div className="px-3 py-2 border-b flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search messages…"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-8 pr-7 h-8 text-xs"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => onSearchChange('')}
                >
                  <X className="size-3" />
                </Button>
              )}
            </div>
            {onClose && (
              <Button variant="ghost" size="icon-xs" className="md:hidden" onClick={onClose}>
                <X className="size-4" />
              </Button>
            )}
          </div>

          {/* About */}
          <div className="flex flex-col items-center gap-2 px-4 py-6 border-b">
            {isLoading ? (
              <>
                <Skeleton className="h-14 w-14 rounded-xl bg-muted" />
                <Skeleton className="h-3 w-24 rounded-[4px] mt-1 bg-muted" />
                <Skeleton className="h-2.5 w-16 rounded-[4px] bg-muted" />
              </>
            ) : (
              <>
                {/* Avatar with camera overlay for group owners */}
                <div className="relative">
                  <Avatar className="h-14 w-14 rounded-xl">
                    <AvatarImage src={displayImage} />
                    <AvatarFallback className="rounded-xl bg-border text-foreground font-mono font-semibold text-lg">
                      {displayName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {isOwner && (
                    <>
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                      <button
                        onClick={() => imageInputRef.current?.click()}
                        disabled={isBusy}
                        className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
                      >
                        {isBusy ? (
                          <Loader2 className="size-5 text-white animate-spin" />
                        ) : (
                          <Camera className="size-5 text-white" strokeWidth={1.5} />
                        )}
                      </button>
                    </>
                  )}
                </div>

                {/* Name with inline edit for group owners */}
                <div className="text-center w-full px-2">
                  {editingName ? (
                    <div className="flex items-center gap-1 justify-center">
                      <Input
                        autoFocus
                        value={nameValue}
                        onChange={(e) => setNameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveName()
                          if (e.key === 'Escape') cancelEdit()
                        }}
                        className="h-7 text-sm text-center font-semibold max-w-[140px]"
                        maxLength={50}
                      />
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={saveName}
                        disabled={isUpdatingRoom}
                      >
                        <Check className="size-3.5 text-green-500" />
                      </Button>
                      <Button size="icon-xs" variant="ghost" onClick={cancelEdit}>
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 justify-center">
                      <p className="font-semibold text-sm">{displayName}</p>
                      {isOwner && (
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={startEditName}
                          className="text-muted-foreground hover:text-foreground shrink-0"
                        >
                          <Pencil className="size-3" />
                        </Button>
                      )}
                    </div>
                  )}
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-0.5">
                    {room?.type === 'DM'
                      ? 'Direct Message'
                      : `Group · ${room?.participants?.length ?? 0} members`}
                  </p>
                  {room?.createdAt && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Created {formatDistanceToNow(new Date(room!.createdAt), { addSuffix: true })}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Section rows */}
          <div className="flex flex-col divide-y">
            <SectionRow
              icon={Users}
              label="Members"
              count={membersCount}
              onClick={() => onNavigate('members')}
            />
            <SectionRow
              icon={ImageIcon}
              label="Photos"
              count={photosCount}
              preview={
                photosPreviews.length > 0 ? (
                  <div className="flex gap-1">
                    {photosPreviews.map((src, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={src}
                        alt=""
                        className="h-8 w-8 rounded-[3px] object-cover opacity-80"
                      />
                    ))}
                  </div>
                ) : null
              }
              onClick={() => onNavigate('photos')}
            />
            <SectionRow
              icon={FileIcon}
              label="Files"
              count={filesCount}
              onClick={() => onNavigate('files')}
            />
            <SectionRow
              icon={Link2}
              label="Links"
              count={linksCount}
              onClick={() => onNavigate('links')}
            />
            <SectionRow icon={Info} label="Settings" onClick={() => onNavigate('settings')} />
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
