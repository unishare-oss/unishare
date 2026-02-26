import { posts, currentUser } from '@/lib/mock-data'
import { PostCard } from '@/components/post-card'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'

export default function MyPostsPage() {
  const myPosts = posts.filter((p) => p.author.id === currentUser.id)

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
