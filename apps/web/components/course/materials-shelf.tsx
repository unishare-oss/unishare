'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Bookmark, Heart } from 'lucide-react'
import { usePostsControllerFindAllInfinite } from '@/src/lib/api/generated/posts/posts'
import { PostType, type PostEntity } from '@/src/lib/api/generated/unishareAPI.schemas'
import { getTypeMeta, sumReactions } from '@/components/feed/feed-card-meta'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 7
const SHELF_SIZE = 6

export interface MaterialCounts {
  all: number
  notes: number
  oldExams: number
  exercises: number
}

type MaterialFilter = 'ALL' | PostType

const FILTERS: { value: MaterialFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: PostType.NOTE, label: 'Notes' },
  { value: PostType.OLD_QUESTION, label: 'Old exams' },
  { value: PostType.EXERCISE, label: 'Exercises' },
]

function authorName(post: PostEntity): string {
  return post.isAnonymous || !post.author ? 'A classmate' : post.author.name
}

export function MaterialCard({ post }: { post: PostEntity }) {
  const meta = getTypeMeta(post.type)
  const Icon = meta.icon
  const reactions = sumReactions(post.reactionCounts)
  const saved = post._count.savedBy

  return (
    <Link
      href={`/posts/${post.id}`}
      className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 transition-colors hover:border-brand/50"
    >
      <div
        aria-hidden="true"
        className={cn('flex h-20 items-center justify-center rounded-md', meta.softBg)}
      >
        <Icon className={cn('size-8', meta.text)} strokeWidth={1.5} />
      </div>
      <div className="flex items-center gap-2 text-xs text-muted">
        <span className={cn('font-medium', meta.text)}>{meta.label}</span>
        {post.moduleNumber && <span>Module {post.moduleNumber}</span>}
      </div>
      <h3 className="line-clamp-2 font-semibold text-ink">{post.title ?? 'Untitled'}</h3>
      <p className="text-xs text-muted">
        {authorName(post)} · {format(new Date(post.createdAt), 'd MMM')}
      </p>
      <div className="mt-auto flex items-center gap-3 text-xs text-muted">
        <span className="inline-flex items-center gap-1" aria-label={`${reactions} reactions`}>
          <Heart className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
          {reactions}
        </span>
        <span className="inline-flex items-center gap-1" aria-label={`Saved by ${saved}`}>
          <Bookmark className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
          {saved}
        </span>
      </div>
    </Link>
  )
}

export function MaterialsShelf({
  courseId,
  counts,
  featured,
}: {
  courseId: string
  counts: MaterialCounts
  featured?: PostEntity
}) {
  const [filter, setFilter] = useState<MaterialFilter>('ALL')
  const [showAll, setShowAll] = useState(false)

  const { data, hasNextPage, fetchNextPage, isFetchingNextPage, isError, isLoading } =
    usePostsControllerFindAllInfinite(
      {
        courseId,
        limit: PAGE_SIZE,
        ...(filter === 'ALL' ? {} : { type: filter }),
      },
      {
        query: {
          select: (result) => result.pages.flatMap((page) => page.data.items),
          getNextPageParam: (last) =>
            last.data.page < last.data.totalPages ? last.data.page + 1 : undefined,
        },
      },
    )

  // "Show all" loads the remaining pages, one after another. After a failed page it stops and
  // waits for "Try again", so a broken request is not retried in a loop.
  useEffect(() => {
    if (showAll && hasNextPage && !isFetchingNextPage && !isError) void fetchNextPage()
  }, [showAll, hasNextPage, isFetchingNextPage, isError, fetchNextPage])

  const grid = (data ?? []).filter((post) => post.id !== featured?.id)
  const visible = showAll ? grid : grid.slice(0, SHELF_SIZE)
  const canShowAll = !showAll && (grid.length > SHELF_SIZE || !!hasNextPage)
  // The newest old exam is featured only under All and Old exams.
  const showFeatured = !!featured && (filter === 'ALL' || filter === PostType.OLD_QUESTION)

  const countFor = (value: MaterialFilter) =>
    ({
      ALL: counts.all,
      [PostType.NOTE]: counts.notes,
      [PostType.OLD_QUESTION]: counts.oldExams,
      [PostType.EXERCISE]: counts.exercises,
    })[value]

  return (
    <section aria-labelledby="course-materials" className="space-y-5">
      <h2 id="course-materials" className="text-lg font-semibold text-ink">
        Course materials
      </h2>

      <div role="group" aria-label="Filter materials" className="flex flex-wrap gap-2">
        {FILTERS.map(({ value, label }) => (
          <Button
            key={value}
            type="button"
            variant="quiet"
            size="sm"
            aria-pressed={filter === value}
            onClick={() => {
              setFilter(value)
              setShowAll(false)
            }}
            className={cn(filter === value && 'border-brand bg-brand-soft text-ink')}
          >
            {label} <span className="text-muted">{countFor(value)}</span>
          </Button>
        ))}
      </div>

      {showFeatured && (
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-widest text-muted">Latest old exam</p>
          <MaterialCard post={featured} />
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted">Loading materials…</p>
      ) : visible.length === 0 ? (
        !showFeatured && <p className="text-sm text-muted">Nothing here yet.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((post) => (
            <li key={post.id}>
              <MaterialCard post={post} />
            </li>
          ))}
        </ul>
      )}

      {isError && showAll ? (
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
          <span>Couldn&apos;t load more materials.</span>
          <Button type="button" variant="quiet" size="sm" onClick={() => void fetchNextPage()}>
            Try again
          </Button>
        </div>
      ) : (
        canShowAll && (
          <Button type="button" variant="quiet" onClick={() => setShowAll(true)}>
            Show all
          </Button>
        )
      )}
    </section>
  )
}
