import { Skeleton } from '@/components/ui/skeleton'

function PostCardSkeleton() {
  return (
    <article aria-hidden className="grid gap-3 rounded-(--r) border-2 border-line bg-surface p-4">
      <div className="flex items-center gap-2.5">
        <Skeleton className="size-[34px] shrink-0 rounded-full" />
        <div className="grid gap-1.5">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="ml-auto h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-[22px] w-2/3" />
      <Skeleton className="h-10 w-full rounded-(--r-s)" />
      <div className="flex gap-3">
        <Skeleton className="h-5 w-10" />
        <Skeleton className="h-5 w-10" />
        <Skeleton className="h-5 w-10" />
      </div>
    </article>
  )
}

export function PostCardSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading posts" className="grid gap-3.5">
      {Array.from({ length: count }, (_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  )
}
