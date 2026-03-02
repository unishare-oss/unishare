'use client'

import { Skeleton } from '@/components/ui/skeleton'

export function CommentListSkeleton() {
  return (
    <div className="space-y-4 py-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="border-b border-border pb-4 last:border-b-0">
          <div className="mb-3 flex items-center gap-2.5">
            <Skeleton className="h-8 w-8 rounded-full bg-card ring-1 ring-border/70" />
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-28 bg-card ring-1 ring-border/60" />
              <Skeleton className="h-3 w-20 bg-muted/80" />
            </div>
          </div>
          <div className="space-y-2 pl-[34px]">
            <Skeleton className="h-3.5 w-full bg-card ring-1 ring-border/60" />
            <Skeleton className="h-3.5 w-[82%] bg-muted/80" />
            <Skeleton className="h-3.5 w-[58%] bg-accent/70" />
          </div>
        </div>
      ))}
    </div>
  )
}
