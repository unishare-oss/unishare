'use client'

import Link from 'next/link'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { UserAvatar } from '@/components/shared/user-avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useFollowsControllerGetFollowers,
  useFollowsControllerGetFollowing,
} from '@/src/lib/api/generated/follows/follows'

interface FollowersDialogProps {
  userId: string
  type: 'followers' | 'following'
  open: boolean
  onClose: () => void
}

export function FollowersDialog({ userId, type, open, onClose }: FollowersDialogProps) {
  const { data: followersData, isLoading: loadingFollowers } = useFollowsControllerGetFollowers(
    userId,
    {
      query: { select: (r) => r.data, enabled: open && type === 'followers' },
    },
  )
  const { data: followingData, isLoading: loadingFollowing } = useFollowsControllerGetFollowing(
    userId,
    {
      query: { select: (r) => r.data, enabled: open && type === 'following' },
    },
  )

  const users = type === 'followers' ? (followersData ?? []) : (followingData ?? [])
  const isLoading = type === 'followers' ? loadingFollowers : loadingFollowing

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm uppercase tracking-wider">
            {type === 'followers' ? 'Followers' : 'Following'}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto space-y-1 -mx-1 px-1">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-2">
                <Skeleton className="size-8 rounded-full shrink-0" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))
          ) : users.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-6">
              {type === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
            </p>
          ) : (
            users.map((u) => (
              <Link
                key={u.id}
                href={`/users/${u.id}`}
                onClick={onClose}
                className="flex items-center gap-3 px-2 py-2 rounded hover:bg-muted transition-colors cursor-pointer"
              >
                <UserAvatar name={u.name} image={u.image ?? null} size="sm" />
                <span className="text-sm text-foreground truncate">{u.name}</span>
              </Link>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
