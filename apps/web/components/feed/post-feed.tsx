import { PostCard } from '@/components/post-card'
import { EmptyState } from '@/components/shared/empty-state'
import { cn } from '@/lib/utils'
import type { ApiPost } from '@/lib/api-types'

interface PostFeedProps {
  posts: ApiPost[]
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function PostFeed({ posts, page, totalPages, onPageChange }: PostFeedProps) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

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

      {totalPages > 1 && (
        <div className="bg-card px-6 py-4 flex items-center justify-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="font-mono text-xs text-text-muted hover:text-foreground px-3 py-1.5 rounded-[6px] hover:bg-muted transition-colors duration-150 disabled:opacity-40 disabled:pointer-events-none"
          >
            Prev
          </button>
          {pages.map((p) => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={cn(
                'font-mono text-xs px-3 py-1.5 rounded-[6px] transition-colors duration-150',
                p === page
                  ? 'text-amber font-medium bg-amber-subtle'
                  : 'text-text-muted hover:text-foreground hover:bg-muted',
              )}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="font-mono text-xs text-text-muted hover:text-foreground px-3 py-1.5 rounded-[6px] hover:bg-muted transition-colors duration-150 disabled:opacity-40 disabled:pointer-events-none"
          >
            Next
          </button>
        </div>
      )}
    </>
  )
}
