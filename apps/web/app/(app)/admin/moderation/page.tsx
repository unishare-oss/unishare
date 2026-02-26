'use client'

import { useState } from 'react'
import { posts } from '@/lib/mock-data'
import type { PostStatus } from '@/lib/mock-data'
import { EmptyState } from '@/components/shared/empty-state'
import { ModerationHeader } from '@/components/admin/moderation/moderation-header'
import { ModerationRow } from '@/components/admin/moderation/moderation-row'

export default function ModerationPage() {
  const [activeFilter, setActiveFilter] = useState<PostStatus>('PENDING')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [postStatuses, setPostStatuses] = useState<Record<string, PostStatus>>(
    Object.fromEntries(posts.map((p) => [p.id, p.status])),
  )

  const filteredPosts = posts.filter((p) => postStatuses[p.id] === activeFilter)
  const pendingCount = posts.filter((p) => postStatuses[p.id] === 'PENDING').length

  const handleStatusChange = (postId: string, newStatus: PostStatus) => {
    setPostStatuses((prev) => ({ ...prev, [postId]: newStatus }))
    setExpandedId(null)
  }

  return (
    <div className="flex flex-col min-h-screen">
      <ModerationHeader
        pendingCount={pendingCount}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      <div className="flex-1 bg-card">
        {filteredPosts.length === 0 ? (
          <EmptyState message={`No ${activeFilter.toLowerCase()} posts.`} />
        ) : (
          filteredPosts.map((post) => (
            <ModerationRow
              key={post.id}
              post={post}
              status={postStatuses[post.id]}
              expanded={expandedId === post.id}
              onToggle={() => setExpandedId(expandedId === post.id ? null : post.id)}
              onApprove={() => handleStatusChange(post.id, 'APPROVED')}
              onReject={() => handleStatusChange(post.id, 'REJECTED')}
            />
          ))
        )}
      </div>
    </div>
  )
}
