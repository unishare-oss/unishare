'use client'

import { Skeleton } from '@/components/ui/skeleton'

/** Mirrors DeckCard's geometry: icon tile, two title lines, badge row. */
export function DeckCardSkeleton() {
  return (
    <article aria-hidden="true" className="card-pop rounded-xl bg-card flex items-start gap-4 p-4">
      <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-24" />
        <div className="flex gap-2 pt-0.5">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
    </article>
  )
}
