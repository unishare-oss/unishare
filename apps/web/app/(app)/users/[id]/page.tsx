'use client'

import { use, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { usePostsControllerFindAll } from '@/src/lib/api/generated/posts/posts'
import {
  useUsersControllerGetById,
  getUsersControllerGetByIdQueryKey,
} from '@/src/lib/api/generated/users/users'
import {
  useFollowsControllerFollow,
  useFollowsControllerUnfollow,
} from '@/src/lib/api/generated/follows/follows'
import { UserAvatar } from '@/components/shared/user-avatar'
import { PageHeader } from '@/components/shared/page-header'
import { PostFeed } from '@/components/feed/post-feed'
import { Button } from '@/components/ui/button'
import type { UserProfileEntity } from '@/src/lib/api/generated/unishareAPI.schemas'
import { useAuth } from '@/contexts/auth-context'
import { pluralize } from '@/lib/utils'

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-lg font-semibold text-foreground">{value}</p>
      <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted">{label}</p>
    </div>
  )
}

function PublicProfileHeader({
  user,
  isSelf,
  onFollow,
  onUnfollow,
  isPending,
}: {
  user: UserProfileEntity
  isSelf: boolean
  onFollow: () => void
  onUnfollow: () => void
  isPending: boolean
}) {
  const joinedYear = user.createdAt ? new Date(user.createdAt).getFullYear() : null

  return (
    <div className="border border-border rounded-[6px] p-6 bg-card mb-6">
      <div className="flex items-start gap-5">
        <UserAvatar name={user.name} image={user.image} size="lg" className="shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl font-semibold text-foreground">{user.name}</h2>
            {!isSelf && (
              <Button
                size="sm"
                variant={user.isFollowing ? 'outline' : 'default'}
                disabled={isPending}
                onClick={user.isFollowing ? onUnfollow : onFollow}
                className="shrink-0"
              >
                {user.isFollowing ? 'Unfollow' : 'Follow'}
              </Button>
            )}
          </div>
          {user.bio && <p className="text-sm text-foreground/80 mt-2">{user.bio}</p>}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="font-mono text-[11px] uppercase tracking-wider px-2 py-0.5 border border-border rounded-[4px] text-foreground">
              {user.role}
            </span>
            {user.department && (
              <span className="font-mono text-[11px] uppercase tracking-wider px-2 py-0.5 border border-border rounded-[4px] text-foreground">
                {user.department.name}
              </span>
            )}
            {joinedYear && (
              <span className="font-mono text-[11px] text-text-muted">Joined {joinedYear}</span>
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
      <div className="flex gap-6 mt-5 pt-5 border-t border-border">
        <StatItem label={pluralize(user.postCount ?? 0, 'Post')} value={user.postCount ?? 0} />
        <StatItem
          label={pluralize(user.commentCount ?? 0, 'Comment')}
          value={user.commentCount ?? 0}
        />
        <StatItem
          label={pluralize(user.savedCount ?? 0, 'Saved', 'Saved')}
          value={user.savedCount ?? 0}
        />
        <StatItem
          label={pluralize(user.followerCount ?? 0, 'Follower')}
          value={user.followerCount ?? 0}
        />
      </div>
    </div>
  )
}

function UserPosts({ userId }: { userId: string }) {
  const [page, setPage] = useState(1)

  const { data } = usePostsControllerFindAll(
    { authorId: userId, page, limit: 20 },
    { query: { select: (r) => r.data } },
  )

  return (
    <div className="border border-border rounded-[6px] bg-card overflow-hidden">
      <div className="px-6 py-3 border-b border-border">
        <h3 className="font-mono text-[11px] uppercase tracking-wider text-text-muted">Posts</h3>
      </div>
      <PostFeed
        posts={data?.items ?? []}
        page={data?.page ?? 1}
        totalPages={data?.totalPages ?? 1}
        onPageChange={setPage}
        emptyMessage="No posts yet."
      />
    </div>
  )
}

export default function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user: me } = useAuth()
  const qc = useQueryClient()

  const { data: user } = useUsersControllerGetById(id, {
    query: { select: (r) => r.data },
  })

  const queryKey = getUsersControllerGetByIdQueryKey(id)

  type UserResponse = { data: UserProfileEntity }

  const optimisticToggle = (following: boolean) => ({
    onMutate: async () => {
      await qc.cancelQueries({ queryKey })
      const snapshot = qc.getQueryData<UserResponse>(queryKey)
      qc.setQueryData<UserResponse>(queryKey, (old) =>
        old
          ? {
              ...old,
              data: {
                ...old.data,
                isFollowing: following,
                followerCount: (old.data.followerCount ?? 0) + (following ? 1 : -1),
              },
            }
          : old,
      )
      return { snapshot }
    },
    onError: (_err: unknown, _vars: unknown, ctx: { snapshot?: UserResponse } | undefined) => {
      if (ctx?.snapshot) qc.setQueryData(queryKey, ctx.snapshot)
    },
    onSettled: () => qc.invalidateQueries({ queryKey }),
  })

  const { mutate: follow, isPending: followPending } = useFollowsControllerFollow({
    mutation: optimisticToggle(true),
  })
  const { mutate: unfollow, isPending: unfollowPending } = useFollowsControllerUnfollow({
    mutation: optimisticToggle(false),
  })

  const isSelf = !!me && me.id === id

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title={user?.name ?? 'Profile'} />
      <div className="flex-1 bg-card">
        <div className="max-w-[700px] mx-auto px-6 py-8">
          {user && (
            <>
              <PublicProfileHeader
                user={user}
                isSelf={isSelf}
                onFollow={() => follow({ id })}
                onUnfollow={() => unfollow({ id })}
                isPending={followPending || unfollowPending}
              />
              <UserPosts userId={id} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
