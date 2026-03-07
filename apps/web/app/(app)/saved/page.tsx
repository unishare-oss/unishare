'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LogIn } from 'lucide-react'
import { usePostsControllerGetSavedPosts } from '@/src/lib/api/generated/posts/posts'
import { useUIStore } from '@/lib/store'
import { authClient } from '@/src/lib/auth/client'
import { PageHeader } from '@/components/shared/page-header'
import { PostFeed } from '@/components/feed/post-feed'
import { PostCard } from '@/components/post-card'
import { EmptyState } from '@/components/shared/empty-state'

export default function SavedPage() {
  const { data: session } = authClient.useSession()
  const guestSavedPosts = useUIStore((s) => s.savedPosts)
  const [page, setPage] = useState(1)

  const { data: apiSavedData } = usePostsControllerGetSavedPosts(
    { page, limit: 20 },
    { query: { select: (r) => r.data, enabled: !!session } },
  )

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Saved" />
      {!session && (
        <div className="flex items-center justify-between gap-4 px-6 py-3 bg-muted border-b border-border">
          <p className="text-sm text-text-muted">
            Saved posts are stored locally and won&apos;t sync across devices.
          </p>
          <Link
            href="/login"
            className="flex items-center gap-1.5 text-sm font-medium text-amber hover:underline shrink-0"
          >
            <LogIn className="size-3.5" strokeWidth={1.5} />
            Sign in to sync
          </Link>
        </div>
      )}
      <div className="flex-1 bg-card">
        {session ? (
          <PostFeed
            posts={apiSavedData?.items ?? []}
            page={apiSavedData?.page ?? 1}
            totalPages={apiSavedData?.totalPages ?? 1}
            onPageChange={setPage}
            emptyMessage="No saved posts yet."
          />
        ) : guestSavedPosts.length === 0 ? (
          <EmptyState message="No saved posts yet." />
        ) : (
          guestSavedPosts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </div>
  )
}
