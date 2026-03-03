'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  usePostsControllerFindAll,
  usePostsControllerUpdateStatus,
  getPostsControllerFindAllQueryKey,
} from '@/src/lib/api/generated/posts/posts'
import { UpdateablePostStatus } from '@/src/lib/api/generated/unishareAPI.schemas'
import { EmptyState } from '@/components/shared/empty-state'
import { ModerationHeader, type PostStatus } from '@/components/admin/moderation/moderation-header'
import { ModerationRow } from '@/components/admin/moderation/moderation-row'

export default function ModerationPage() {
  const [activeFilter, setActiveFilter] = useState<PostStatus>('PENDING')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data } = usePostsControllerFindAll(
    { status: activeFilter, limit: 50 },
    { query: { select: (r) => r.data } },
  )

  const { data: pendingData } = usePostsControllerFindAll(
    { status: 'PENDING', limit: 1 },
    { query: { select: (r) => r.data } },
  )

  const { mutate: updateStatus } = usePostsControllerUpdateStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getPostsControllerFindAllQueryKey() })
        setExpandedId(null)
      },
    },
  })

  const posts = data?.items ?? []
  const pendingCount = pendingData?.total ?? 0

  function handleApprove(postId: string) {
    updateStatus({ id: postId, data: { status: UpdateablePostStatus.APPROVED } })
  }

  function handleReject(postId: string) {
    updateStatus({ id: postId, data: { status: UpdateablePostStatus.REJECTED } })
  }

  return (
    <div className="flex flex-col min-h-screen">
      <ModerationHeader
        pendingCount={pendingCount}
        activeFilter={activeFilter}
        onFilterChange={(f) => {
          setActiveFilter(f)
          setExpandedId(null)
        }}
      />

      <div className="flex-1 bg-card">
        {posts.length === 0 ? (
          <EmptyState message={`No ${activeFilter.toLowerCase()} posts.`} />
        ) : (
          posts.map((post) => (
            <ModerationRow
              key={post.id}
              post={post}
              status={post.status as PostStatus}
              expanded={expandedId === post.id}
              onToggle={() => setExpandedId(expandedId === post.id ? null : post.id)}
              onApprove={() => handleApprove(post.id)}
              onReject={() => handleReject(post.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}
