'use client'

import Link from 'next/link'
import { LogIn } from 'lucide-react'
import { usePostsControllerGetSavedPosts } from '@/src/lib/api/generated/posts/posts'
import { useUIStore } from '@/lib/store'
import { authClient } from '@/src/lib/auth/client'
import { PostCard } from '@/components/post-card'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'

export default function SavedPage() {
  const { data: session } = authClient.useSession()
  const guestSavedPosts = useUIStore((s) => s.savedPosts)

  const { data: apiSavedData } = usePostsControllerGetSavedPosts(
    {},
    { query: { select: (r) => r.data, enabled: !!session } },
  )

  const savedPosts = session ? (apiSavedData?.items ?? []) : guestSavedPosts

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
        {savedPosts.length === 0 ? (
          <EmptyState message="No saved posts yet." />
        ) : (
          savedPosts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </div>
  )
}
