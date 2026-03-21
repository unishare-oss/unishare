'use client'
import { Skeleton } from '@/components/ui/skeleton'

export function RoomCardSkeleton() {
  return (
    <article
      aria-hidden
      className="rounded-[6px] border border-border bg-card p-4 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-2/5 bg-muted" />
        <Skeleton className="size-5 rounded-md bg-muted" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-5 w-20 rounded-full bg-muted" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-3 w-24 bg-muted" />
        <Skeleton className="h-3 w-24 bg-muted" />
      </div>
    </article>
  )
}
