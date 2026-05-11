'use client'

import { useState } from 'react'
import { keepPreviousData } from '@tanstack/react-query'
import { Globe, Lock, Share2 } from 'lucide-react'
import { use } from 'react'
import {
  useReadingListsControllerFindOne,
  useReadingListsControllerGetListPosts,
} from '@/src/lib/api/generated/reading-lists/reading-lists'
import type { PaginatedPostEntity } from '@/src/lib/api/generated/unishareAPI.schemas'
import { PostFeed } from '@/components/feed/post-feed'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { ShareDialog } from '@/components/reading-lists/share-dialog'
import { EmptyState } from '@/components/shared/empty-state'
import { useAuth } from '@/contexts/auth-context'

export default function ListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [page, setPage] = useState(1)
  const [shareOpen, setShareOpen] = useState(false)
  const { session } = useAuth()

  const {
    data: list,
    refetch: refetchList,
    error: listError,
  } = useReadingListsControllerFindOne(id, {
    query: { select: (r) => r.data },
  })

  const isPrivate = (listError as any)?.response?.status === 403

  const { data: postsRaw, isLoading } = useReadingListsControllerGetListPosts(
    id,
    { page, limit: 20 },
    { query: { placeholderData: keepPreviousData, enabled: !isPrivate } },
  )
  const postsData = postsRaw?.data as PaginatedPostEntity | undefined

  const isOwner = list && session?.user?.id === list.userId

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title={list?.name ?? 'Reading List'}
        subtitle={list?.description ?? undefined}
        action={
          list && (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 font-mono text-[11px] text-text-muted uppercase tracking-wide">
                {list.isPublic ? (
                  <Globe className="size-3.5" strokeWidth={1.5} />
                ) : (
                  <Lock className="size-3.5" strokeWidth={1.5} />
                )}
                {list.isPublic ? 'Public' : 'Private'}
              </span>
              {isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShareOpen(true)}
                  className="gap-1.5"
                >
                  <Share2 className="size-3.5" strokeWidth={1.5} />
                  Share
                </Button>
              )}
            </div>
          )
        }
      />
      <div className="flex-1 bg-card">
        {isPrivate ? (
          <EmptyState
            message="This reading list is private."
            description="Only the owner can view its contents."
          />
        ) : (
          <PostFeed
            posts={postsData?.items ?? []}
            loading={isLoading}
            page={postsData?.page ?? 1}
            totalPages={postsData?.totalPages ?? 1}
            onPageChange={setPage}
            emptyMessage="No posts in this list yet."
          />
        )}
      </div>

      {list && (
        <ShareDialog
          list={list}
          open={shareOpen}
          onOpenChange={setShareOpen}
          isOwner={isOwner || false}
          onPublicityChange={() => refetchList()}
        />
      )}
    </div>
  )
}
