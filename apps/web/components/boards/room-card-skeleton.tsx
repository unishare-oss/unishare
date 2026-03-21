'use client'
import { Skeleton } from '@/components/ui/skeleton'

export function RoomCardSkeleton() {
  return (
    <article
      aria-hidden
      className="rounded-[6px] border border-border bg-card flex flex-col overflow-hidden"
    >
      <Skeleton className="h-24 w-full rounded-none bg-muted" />
      <div className="p-4 flex flex-col gap-2.5">
        <Skeleton className="h-4 w-2/5 bg-muted" />
        <Skeleton className="h-5 w-16 rounded-full bg-muted" />
        <div className="flex gap-3">
          <Skeleton className="h-3 w-20 bg-muted" />
          <Skeleton className="h-3 w-20 bg-muted" />
        </div>
      </div>
    </article>
  )
}
