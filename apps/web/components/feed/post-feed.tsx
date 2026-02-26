import { PostCard } from '@/components/post-card'
import { EmptyState } from '@/components/shared/empty-state'
import type { Post } from '@/lib/mock-data'

interface PostFeedProps {
  posts: Post[]
}

export function PostFeed({ posts }: PostFeedProps) {
  return (
    <>
      <div className="flex-1 bg-card">
        {posts.length === 0 ? (
          <EmptyState
            message="No posts found"
            description="Try adjusting your filters or search query."
          />
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>

      <div className="bg-card px-6 py-4 flex items-center justify-center gap-2">
        <button className="font-mono text-xs text-text-muted hover:text-foreground px-3 py-1.5 rounded-[6px] hover:bg-muted transition-colors duration-150">
          Prev
        </button>
        <span className="font-mono text-xs text-amber font-medium px-3 py-1.5 bg-amber-subtle rounded-[6px]">
          1
        </span>
        <button className="font-mono text-xs text-text-muted hover:text-foreground px-3 py-1.5 rounded-[6px] hover:bg-muted transition-colors duration-150">
          2
        </button>
        <button className="font-mono text-xs text-text-muted hover:text-foreground px-3 py-1.5 rounded-[6px] hover:bg-muted transition-colors duration-150">
          3
        </button>
        <button className="font-mono text-xs text-text-muted hover:text-foreground px-3 py-1.5 rounded-[6px] hover:bg-muted transition-colors duration-150">
          Next
        </button>
      </div>
    </>
  )
}
