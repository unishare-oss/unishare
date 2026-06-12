'use client'

import type { CSSProperties } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { FeedStyle } from '@/lib/store'

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
        'relative flex items-start justify-between px-4 py-4 md:px-6 md:py-5 border-b border-border bg-card',
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

export function ArcadePostCardSkeleton({ index = 0 }: { index?: number }) {
  const titleWidth = titleWidths[index % titleWidths.length]

  return (
    <article
      aria-hidden
      className="grid grid-cols-[56px_1fr] sm:grid-cols-[80px_1fr] rounded-2xl border-[3px] border-border bg-card overflow-hidden"
    >
      <div className="border-r-[3px] border-border bg-muted" />
      <div className="p-4 sm:p-5">
        <div className="flex items-center gap-2.5 mb-2">
          <Skeleton className="h-5 w-20 rounded-md bg-muted" />
          <Skeleton className="h-4 w-16 bg-muted" />
        </div>
        <Skeleton className={cn('h-6 mb-3 bg-muted', titleWidth)} />
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-5 w-16 rounded-lg bg-muted" />
          <Skeleton className="h-5 w-20 rounded-lg bg-muted" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-14 rounded-[10px] bg-muted" />
          <Skeleton className="h-7 w-14 rounded-[10px] bg-muted" />
          <Skeleton className="h-7 w-14 rounded-[10px] bg-muted" />
        </div>
      </div>
    </article>
  )
}

const skeletonTilts = [-1.6, 1.2, -0.8, 1.8, -1.2, 0.9] as const

export function DeskPostCardSkeleton({ index = 0 }: { index?: number }) {
  const titleWidth = titleWidths[index % titleWidths.length]
  const tilt = skeletonTilts[index % skeletonTilts.length]

  return (
    <article
      aria-hidden
      className="relative bg-card border border-border px-5 pt-7 pb-4"
      style={{ transform: `rotate(${tilt}deg)` } as CSSProperties}
    >
      <Skeleton className="absolute -top-3 left-1/2 -translate-x-1/2 h-6 w-24 bg-muted" />
      <Skeleton className="h-6 w-24 rounded-full bg-muted mb-3" />
      <Skeleton className={cn('h-6 mb-2 bg-muted', titleWidth)} />
      <Skeleton className="h-4 w-2/3 bg-muted mb-3" />
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="size-4 rounded-full bg-muted" />
        <Skeleton className="h-3 w-24 bg-muted" />
      </div>
      <div className="flex items-center gap-3 border-t-[1.5px] border-dashed border-border pt-3">
        <Skeleton className="h-4 w-10 bg-muted" />
        <Skeleton className="h-4 w-10 bg-muted" />
        <Skeleton className="h-4 w-10 bg-muted" />
      </div>
    </article>
  )
}

export function PostCardSkeletonList({
  count = 3,
  variant = 'classic',
}: {
  count?: number
  variant?: FeedStyle
}) {
  if (variant === 'arcade') {
    return (
      <div role="status" aria-label="Loading posts" className="flex flex-col gap-6">
        {Array.from({ length: count }, (_, i) => (
          <ArcadePostCardSkeleton key={i} index={i} />
        ))}
      </div>
    )
  }

  if (variant === 'desk') {
    return (
      <div
        role="status"
        aria-label="Loading posts"
        className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start"
      >
        {Array.from({ length: count }, (_, i) => (
          <DeskPostCardSkeleton key={i} index={i} />
        ))}
      </div>
    )
  }

  return (
    <div role="status" aria-label="Loading posts">
      {Array.from({ length: count }, (_, i) => (
        <PostCardSkeleton key={i} index={i} />
      ))}
    </div>
  )
}
