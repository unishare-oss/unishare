'use client'

import { useState } from 'react'
import { keepPreviousData } from '@tanstack/react-query'
import Link from 'next/link'
import { LogIn } from 'lucide-react'
import { usePostsControllerGetSavedPosts } from '@/src/lib/api/generated/posts/posts'
import { useReadingListsControllerGetListPosts } from '@/src/lib/api/generated/reading-lists/reading-lists'
import { useUIStore } from '@/lib/store'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/shared/page-header'
import { PostFeed } from '@/components/feed/post-feed'
import { PostCard } from '@/components/post-card'
import { EmptyState } from '@/components/shared/empty-state'
import { ReadingListsSidebar } from '@/components/reading-lists/reading-lists-sidebar'

export default function SavedPage() {
  const { isAuthenticated } = useAuth()
  const guestSavedPosts = useUIStore((s) => s.savedPosts)
  const [page, setPage] = useState(1)
  const [selectedListId, setSelectedListId] = useState<string | null>(null)

  const { data: apiSavedData, isLoading: savedLoading } = usePostsControllerGetSavedPosts(
    { page, limit: 20 },
    {
      query: {
        select: (r) => r.data,
        enabled: isAuthenticated && selectedListId === null,
        placeholderData: keepPreviousData,
      },
    },
  )

  const { data: listPostsData, isLoading: listLoading } = useReadingListsControllerGetListPosts(
    selectedListId ?? '',
    { page, limit: 20 },
    {
      query: {
        select: (r) => r.data,
        enabled: isAuthenticated && selectedListId !== null,
        placeholderData: keepPreviousData,
      },
    },
  )

  const activeData = selectedListId ? listPostsData : apiSavedData
  const activeLoading = selectedListId ? listLoading : savedLoading

  function handleListSelect(id: string | null) {
    setSelectedListId(id)
    setPage(1)
  }

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Saved" />
      {!isAuthenticated && (
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
      <div className="flex flex-1">
        {isAuthenticated && (
          <ReadingListsSidebar selectedListId={selectedListId} onSelect={handleListSelect} />
        )}
        <div className="flex-1 bg-card">
          {isAuthenticated ? (
            <PostFeed
              posts={activeData?.items ?? []}
              loading={activeLoading}
              page={activeData?.page ?? 1}
              totalPages={activeData?.totalPages ?? 1}
              onPageChange={setPage}
              emptyMessage="No posts in this list yet."
            />
          ) : guestSavedPosts.length === 0 ? (
            <EmptyState message="No saved posts yet." />
          ) : (
            guestSavedPosts.map((post) => <PostCard key={post.id} post={post} />)
          )}
        </div>
      </div>
    </div>
  )
}
