'use client'

import { posts } from '@/lib/mock-data'
import { PostCard } from '@/components/post-card'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'

export default function SavedPage() {
  const savedPosts = posts.filter((p) => p.savedByUser)

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Saved" />
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
