'use client'

import { useState } from 'react'
import { keepPreviousData } from '@tanstack/react-query'
import { Globe, Lock } from 'lucide-react'
import { use } from 'react'
import {
  useReadingListsControllerFindOne,
  useReadingListsControllerGetListPosts,
} from '@/src/lib/api/generated/reading-lists/reading-lists'
import type { PaginatedPostEntity } from '@/src/lib/api/generated/unishareAPI.schemas'
import { PostFeed } from '@/components/feed/post-feed'
import { PageHeader } from '@/components/shared/page-header'

export default function ListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [page, setPage] = useState(1)

  const { data: list } = useReadingListsControllerFindOne(id, {
    query: { select: (r) => r.data },
  })

  const { data: postsRaw, isLoading } = useReadingListsControllerGetListPosts(
    id,
    { page, limit: 20 },
    { query: { placeholderData: keepPreviousData } },
  )
  const postsData = postsRaw?.data as PaginatedPostEntity | undefined

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title={list?.name ?? 'Reading List'}
        subtitle={list?.description ?? undefined}
        action={
          list && (
            <span className="flex items-center gap-1 font-mono text-[11px] text-text-muted uppercase tracking-wide">
              {list.isPublic ? (
                <Globe className="size-3.5" strokeWidth={1.5} />
              ) : (
                <Lock className="size-3.5" strokeWidth={1.5} />
              )}
              {list.isPublic ? 'Public' : 'Private'}
            </span>
          )
        }
      />
      <div className="flex-1 bg-card">
        <PostFeed
          posts={postsData?.items ?? []}
          loading={isLoading}
          page={postsData?.page ?? 1}
          totalPages={postsData?.totalPages ?? 1}
          onPageChange={setPage}
          emptyMessage="No posts in this list yet."
        />
      </div>
    </div>
  )
}
