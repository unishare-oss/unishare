'use client'

import { useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { UserAvatar } from '@/components/shared/user-avatar'
import { Button } from '@/components/ui/button'
import type { UserProfileEntity } from '@/src/lib/api/generated/unishareAPI.schemas'
import { storageControllerGetPresignedUploadUrl } from '@/src/lib/api/generated/storage/storage'
import {
  PresignedUploadDtoPurpose,
  PresignedUploadDtoUploadType,
  type PresignedUploadEntity,
} from '@/src/lib/api/generated/unishareAPI.schemas'
import {
  useUsersControllerUpdateMe,
  getUsersControllerGetMeQueryKey,
} from '@/src/lib/api/generated/users/users'

interface ProfileHeaderCardProps {
  user: UserProfileEntity
}

export function ProfileHeaderCard({ user }: ProfileHeaderCardProps) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const { mutateAsync: updateMe } = useUsersControllerUpdateMe()

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const res = await storageControllerGetPresignedUploadUrl({
        mimeType: file.type,
        uploadType: PresignedUploadDtoUploadType.image,
        purpose: PresignedUploadDtoPurpose['profile-picture'],
      })
      const { url, publicUrl } = res.data as PresignedUploadEntity
      await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
      await updateMe({ data: { image: publicUrl } })
      await queryClient.invalidateQueries({ queryKey: getUsersControllerGetMeQueryKey() })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="border border-border rounded-[6px] p-6 bg-card mb-6">
      <div className="flex items-start gap-5">
        <div className="relative group shrink-0">
          <UserAvatar name={user.name} image={user.image} size="lg" />
          <Button
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute inset-0 rounded-[6px] bg-surface-dark/50 opacity-0 group-hover:opacity-100 flex items-center justify-center hover:bg-surface-dark/50 disabled:cursor-wait disabled:opacity-0 group-hover:disabled:opacity-100"
            aria-label="Change profile picture"
          >
            <Camera className="size-5 text-card" strokeWidth={1.5} />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-foreground">{user.name}</h2>
          <p className="font-mono text-sm text-text-muted mt-0.5">{user.email}</p>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="font-mono text-[11px] uppercase tracking-wider px-2 py-0.5 border border-border rounded-[4px] text-foreground">
              {user.role}
            </span>
            {user.department && (
              <span className="font-mono text-[11px] uppercase tracking-wider px-2 py-0.5 border border-border rounded-[4px] text-foreground">
                {user.department.name}
              </span>
            )}
          </div>
          {user.yearLevel != null && (
            <p
              className="font-mono text-[13px] text-amber mt-2 cursor-help"
              title="Based on enrollment year + academic calendar"
            >
              Year {user.yearLevel} Student
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
