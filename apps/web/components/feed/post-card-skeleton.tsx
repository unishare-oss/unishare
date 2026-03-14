'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const titleWidths = ['w-2/3', 'w-1/2', 'w-3/5'] as const
const authorWidths = ['w-28', 'w-24', 'w-32'] as const
const metaWidths = ['w-14', 'w-16', 'w-12'] as const

export function PostCardSkeleton({ index = 0, className }: { index?: number; className?: string }) {
  const titleWidth = titleWidths[index % titleWidths.length]
  const authorWidth = authorWidths[index % authorWidths.length]
  const metaWidth = metaWidths[index % metaWidths.length]

  return (
    <article
      aria-hidden
      className={cn(
        'relative flex items-start justify-between px-6 py-5 border-b border-border bg-card',
        className,
      )}
    >
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center gap-2 mb-1.5">
          <Skeleton className="h-5 w-24 rounded-lg bg-muted" />
          <Skeleton className="h-5 w-16 rounded-lg bg-muted" />
          <Skeleton className="h-5 w-28 rounded-lg bg-muted" />
        </div>

        <Skeleton className={cn('h-5 mb-3 bg-muted', titleWidth)} />

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Skeleton className="size-4 rounded-full bg-muted" />
            <Skeleton className={cn('h-3 bg-muted', authorWidth)} />
          </div>
          <Skeleton className={cn('h-3 bg-muted', metaWidth)} />
          <Skeleton className="h-3 w-20 bg-muted" />
          <Skeleton className="h-3 w-16 bg-muted" />
        </div>
      </div>

      <Skeleton className="size-8 rounded-md bg-muted" />
    </article>
  )
}

export function PostCardSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading posts">
      {Array.from({ length: count }, (_, i) => (
        <PostCardSkeleton key={i} index={i} />
      ))}
    </div>
  )
}
