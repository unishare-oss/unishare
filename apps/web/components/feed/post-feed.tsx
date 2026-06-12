'use client'

import { PostCard } from '@/components/post-card'
import { ArcadePostCard } from '@/components/feed/arcade-post-card'
import { DeskPostCard } from '@/components/feed/desk-post-card'
import { PostCardSkeletonList } from '@/components/feed/post-card-skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { cn } from '@/lib/utils'
import { useFeedStyleStore } from '@/lib/store'
import type { ApiPost } from '@/lib/api-types'
import { Button } from '@/components/ui/button'

/**
 * Minimum trendingScore (server-computed: views*0.3 + reactions*0.7 with
 * 7-day decay) before the hottest visible post earns a trending badge.
 * Prevents badging a quiet feed where the "top" post has near-zero traction.
 */
const TRENDING_BADGE_MIN_SCORE = 10

interface PostFeedProps {
  posts: ApiPost[]
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  loading?: boolean
  emptyMessage?: string
  emptyDescription?: string
}

export function PostFeed({
  posts,
  page,
  totalPages,
  onPageChange,
  loading = false,
  emptyMessage = 'No posts found',
  emptyDescription,
}: PostFeedProps) {
  const feedStyle = useFeedStyleStore((s) => s.feedStyle)

  // The hottest post among those currently rendered gets the trending badge.
  const maxScore = posts.reduce((max, p) => Math.max(max, p.trendingScore ?? 0), 0)
  const trendingId =
    maxScore >= TRENDING_BADGE_MIN_SCORE
      ? posts.find((p) => (p.trendingScore ?? 0) === maxScore)?.id
      : undefined

  function getPageWindows(): (number | '...')[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const items: (number | '...')[] = [1]
    if (page > 3) items.push('...')
    for (let p = Math.max(2, page - 2); p <= Math.min(totalPages - 1, page + 2); p++) {
      items.push(p)
    }
    if (page < totalPages - 2) items.push('...')
    items.push(totalPages)
    return items
  }

  function renderPosts() {
    if (feedStyle === 'arcade') {
      return (
        <div className="mx-auto w-full max-w-4xl px-4 py-6 md:px-6 flex flex-col gap-6">
          {posts.map((post, i) => (
            <ArcadePostCard key={post.id} post={post} index={i} trending={post.id === trendingId} />
          ))}
        </div>
      )
    }
    if (feedStyle === 'desk') {
      return (
        <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {posts.map((post, i) => (
            <DeskPostCard key={post.id} post={post} index={i} trending={post.id === trendingId} />
          ))}
        </div>
      )
    }
    return posts.map((post) => <PostCard key={post.id} post={post} />)
  }

  return (
    <>
      <div className={cn('flex-1', feedStyle === 'classic' ? 'bg-card' : 'bg-background')}>
        {loading && posts.length === 0 ? (
          feedStyle === 'classic' ? (
            <PostCardSkeletonList count={3} />
          ) : (
            <div
              className={cn(
                'mx-auto w-full px-4 md:px-6',
                feedStyle === 'arcade' ? 'max-w-4xl py-6' : 'max-w-5xl py-8',
              )}
            >
              <PostCardSkeletonList count={feedStyle === 'desk' ? 4 : 3} variant={feedStyle} />
            </div>
          )
        ) : posts.length === 0 ? (
          <EmptyState message={emptyMessage} description={emptyDescription} />
        ) : (
          renderPosts()
        )}
      </div>

      {totalPages > 1 && (
        <div
          className={cn(
            'px-6 py-4 flex items-center justify-center gap-2',
            feedStyle === 'classic' ? 'bg-card' : 'bg-background',
          )}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="font-mono text-xs text-text-muted"
          >
            Prev
          </Button>
          {getPageWindows().map((p, i) =>
            p === '...' ? (
              <span key={`ellipsis-${i}`} className="font-mono text-xs text-text-muted px-1">
                …
              </span>
            ) : (
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
            ),
          )}
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
