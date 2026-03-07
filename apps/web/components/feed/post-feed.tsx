import { PostCard } from '@/components/post-card'
import { EmptyState } from '@/components/shared/empty-state'
import { cn } from '@/lib/utils'
import type { ApiPost } from '@/lib/api-types'
import { Button } from '@/components/ui/button'

interface PostFeedProps {
  posts: ApiPost[]
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  emptyMessage?: string
  emptyDescription?: string
}

export function PostFeed({
  posts,
  page,
  totalPages,
  onPageChange,
  emptyMessage = 'No posts found',
  emptyDescription,
}: PostFeedProps) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <>
      <div className="flex-1 bg-card">
        {posts.length === 0 ? (
          <EmptyState message={emptyMessage} description={emptyDescription} />
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>

      {totalPages > 1 && (
        <div className="bg-card px-6 py-4 flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="font-mono text-xs text-text-muted"
          >
            Prev
          </Button>
          {pages.map((p) => (
            <Button
              key={p}
              variant="ghost"
              size="sm"
              onClick={() => onPageChange(p)}
              className={cn(
                'font-mono text-xs',
                p === page
                  ? 'text-amber font-medium bg-amber-subtle hover:bg-amber-subtle'
                  : 'text-text-muted',
              )}
            >
              {p}
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="font-mono text-xs text-text-muted"
          >
            Next
          </Button>
        </div>
      )}
    </>
  )
}
