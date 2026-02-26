'use client'

import { posts } from '@/lib/mock-data'
import { PostCard } from '@/components/post-card'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { useUIStore } from '@/lib/store'
import { useEffect, useState } from 'react'

export default function SavedPage() {
  const savedPostIds = useUIStore((s) => s.savedPostIds)
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch by waiting for mount
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex flex-col min-h-screen">
        <PageHeader title="Saved" />
        <div className="flex-1 bg-card" />
      </div>
    )
  }

  const savedPosts = posts.filter((p) => savedPostIds.includes(p.id))

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
