'use client'

import { usePostsControllerFindAll } from '@/src/lib/api/generated/posts/posts'
import { authClient } from '@/src/lib/auth/client'
import { PostCard } from '@/components/post-card'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'

export default function MyPostsPage() {
  const { data: session } = authClient.useSession()

  const { data } = usePostsControllerFindAll(
    { authorId: session?.user?.id, limit: 100 },
    { query: { select: (r) => r.data, enabled: !!session?.user?.id } },
  )

  const myPosts = data?.items ?? []

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="My Posts" />
      <div className="flex-1 bg-card">
        {myPosts.length === 0 ? (
          <EmptyState message={"You haven't posted anything yet."} />
        ) : (
          myPosts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </div>
  )
}
