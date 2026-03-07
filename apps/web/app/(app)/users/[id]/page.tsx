'use client'

import { use } from 'react'
import { usePostsControllerFindAll } from '@/src/lib/api/generated/posts/posts'
import { useUsersControllerGetById } from '@/src/lib/api/generated/users/users'
import { UserAvatar } from '@/components/shared/user-avatar'
import { PageHeader } from '@/components/shared/page-header'
import { PostCard } from '@/components/post-card'
import type { UserProfileEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-lg font-semibold text-foreground">{value}</p>
      <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted">{label}</p>
    </div>
  )
}

function PublicProfileHeader({ user }: { user: UserProfileEntity }) {
  const joinedYear = user.createdAt ? new Date(user.createdAt).getFullYear() : null

  return (
    <div className="border border-border rounded-[6px] p-6 bg-card mb-6">
      <div className="flex items-start gap-5">
        <UserAvatar name={user.name} image={user.image} size="lg" className="shrink-0" />
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-foreground">{user.name}</h2>
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
        <StatItem label="Posts" value={user.postCount ?? 0} />
        <StatItem label="Comments" value={user.commentCount ?? 0} />
        <StatItem label="Saved" value={user.savedCount ?? 0} />
      </div>
    </div>
  )
}

function UserPosts({ userId }: { userId: string }) {
  const { data: posts } = usePostsControllerFindAll(
    { authorId: userId, limit: 100 },
    { query: { select: (r) => r.data } },
  )

  const items = posts?.items ?? []

  return (
    <div className="border border-border rounded-[6px] bg-card overflow-hidden">
      <div className="px-6 py-3 border-b border-border">
        <h3 className="font-mono text-[11px] uppercase tracking-wider text-text-muted">Posts</h3>
      </div>
      {items.length === 0 ? (
        <p className="font-mono text-sm text-text-muted text-center py-16">No posts yet.</p>
      ) : (
        items.map((post) => <PostCard key={post.id} post={post} />)
      )}
    </div>
  )
}

export default function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const { data: user } = useUsersControllerGetById(id, {
    query: { select: (r) => r.data },
  })

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title={user?.name ?? 'Profile'} />
      <div className="flex-1 bg-card">
        <div className="max-w-[700px] mx-auto px-6 py-8">
          {user && (
            <>
              <PublicProfileHeader user={user} />
              <UserPosts userId={id} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
