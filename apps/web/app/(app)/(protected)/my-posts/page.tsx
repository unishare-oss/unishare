'use client'

import { useState } from 'react'
import { usePostsControllerFindAll } from '@/src/lib/api/generated/posts/posts'
import { authClient } from '@/src/lib/auth/client'
import { PageHeader } from '@/components/shared/page-header'
import { PostFeed } from '@/components/feed/post-feed'

export default function MyPostsPage() {
  const { data: session } = authClient.useSession()
  const [page, setPage] = useState(1)

  const { data } = usePostsControllerFindAll(
    { authorId: session?.user?.id, page, limit: 20 },
    { query: { select: (r) => r.data, enabled: !!session?.user?.id } },
  )

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="My Posts" />
      <div className="flex-1 bg-card">
        <PostFeed
          posts={data?.items ?? []}
          page={data?.page ?? 1}
          totalPages={data?.totalPages ?? 1}
          onPageChange={setPage}
          emptyMessage="You haven't posted anything yet."
        />
      </div>
    </div>
  )
}
