'use client'

import { use, useState } from 'react'
import { Globe } from 'lucide-react'
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
import { useReadingListsControllerFindPublicByUser } from '@/src/lib/api/generated/reading-lists/reading-lists'
import { UserAvatar } from '@/components/shared/user-avatar'
import { PageHeader } from '@/components/shared/page-header'
import { PostFeed } from '@/components/feed/post-feed'
import { Button } from '@/components/ui/button'
import { FollowersDialog } from '@/components/profile/followers-dialog'
import { cn } from '@/lib/utils'
import type { UserProfileEntity } from '@/src/lib/api/generated/unishareAPI.schemas'
import { useAuth } from '@/contexts/auth-context'
import { pluralize } from '@/lib/utils'
import Link from 'next/link'

type FollowDialog = 'followers' | 'following' | null
type ProfileTab = 'posts' | 'lists'

function StatButton({
  label,
  value,
  onClick,
}: {
  label: string
  value: number
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn('text-center', onClick && 'hover:opacity-70 transition-opacity cursor-pointer')}
    >
      <p className="text-lg font-semibold text-foreground">{value}</p>
      <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted">{label}</p>
    </button>
  )
}

function PublicProfileHeader({
  user,
  isSelf,
  onFollow,
  onUnfollow,
  isPending,
  onOpenFollowers,
  onOpenFollowing,
}: {
  user: UserProfileEntity
  isSelf: boolean
  onFollow: () => void
  onUnfollow: () => void
  isPending: boolean
  onOpenFollowers: () => void
  onOpenFollowing: () => void
}) {
  const joinedYear = user.createdAt ? new Date(user.createdAt).getFullYear() : null

  return (
    <div className="border border-border rounded-[6px] p-6 bg-card mb-6">
      <div className="flex items-start gap-5">
        <UserAvatar name={user.name} image={user.image} size="lg" className="shrink-0" priority />
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
        <StatButton label={pluralize(user.postCount ?? 0, 'Post')} value={user.postCount ?? 0} />
        <StatButton
          label={pluralize(user.commentCount ?? 0, 'Comment')}
          value={user.commentCount ?? 0}
        />
        <StatButton
          label={pluralize(user.followerCount ?? 0, 'Follower')}
          value={user.followerCount ?? 0}
          onClick={onOpenFollowers}
        />
        <StatButton label="Following" value={user.followingCount ?? 0} onClick={onOpenFollowing} />
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

function UserLists({ userId }: { userId: string }) {
  const { data: lists } = useReadingListsControllerFindPublicByUser(userId, {
    query: { select: (r) => r.data },
  })

  if (!lists?.length) {
    return (
      <div className="border border-border rounded-[6px] bg-card px-6 py-10 text-center">
        <p className="text-sm text-text-muted">No public lists yet.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      {lists.map((list) => (
        <Link
          key={list.id}
          href={`/lists/${list.id}`}
          className="border border-border rounded-[6px] bg-card px-5 py-4 hover:bg-muted transition-colors flex items-center justify-between gap-4"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Globe className="size-3.5 text-text-muted shrink-0" strokeWidth={1.5} />
              <span className="font-medium text-sm text-foreground truncate">{list.name}</span>
            </div>
            {list.description && (
              <p className="text-xs text-text-muted mt-1 truncate">{list.description}</p>
            )}
          </div>
          <span className="font-mono text-xs text-text-muted shrink-0">
            {list.postCount} {pluralize(list.postCount, 'post')}
          </span>
        </Link>
      ))}
    </div>
  )
}

export default function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user: me } = useAuth()
  const qc = useQueryClient()
  const [followDialog, setFollowDialog] = useState<FollowDialog>(null)
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts')

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
  const tabs: { key: ProfileTab; label: string }[] = [
    { key: 'posts', label: 'Posts' },
    { key: 'lists', label: 'Lists' },
  ]

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
                onOpenFollowers={() => setFollowDialog('followers')}
                onOpenFollowing={() => setFollowDialog('following')}
              />

              {/* Tabs */}
              <div className="flex items-center gap-1 border-b border-border mb-4">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    className={cn(
                      'font-mono text-xs uppercase tracking-wider px-4 py-3 border-b-2 transition-colors',
                      activeTab === t.key
                        ? 'border-amber text-amber font-medium'
                        : 'border-transparent text-text-muted hover:text-foreground',
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {activeTab === 'posts' && <UserPosts userId={id} />}
              {activeTab === 'lists' && <UserLists userId={id} />}

              <FollowersDialog
                userId={id}
                type={followDialog ?? 'followers'}
                open={followDialog !== null}
                onClose={() => setFollowDialog(null)}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
