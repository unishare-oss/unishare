'use client'

import { useState } from 'react'
import { keepPreviousData } from '@tanstack/react-query'
import { usePostsControllerFindAll } from '@/src/lib/api/generated/posts/posts'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/shared/page-header'
import { PostFeed } from '@/components/feed/post-feed'

export default function MyPostsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [page, setPage] = useState(1)

  const { data, isLoading } = usePostsControllerFindAll(
    { authorId: user?.id, page, limit: 20 },
    {
      query: {
        select: (r) => r.data,
        enabled: !!user?.id,
        placeholderData: keepPreviousData,
      },
    },
  )

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="My Posts" />
      <PostFeed
        posts={data?.items ?? []}
        loading={authLoading || isLoading}
        page={data?.page ?? 1}
        totalPages={data?.totalPages ?? 1}
        onPageChange={setPage}
        emptyMessage="You haven't posted anything yet."
      />
    </div>
  )
}
