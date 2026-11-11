'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { usePostsControllerFindAll } from '@/src/lib/api/generated/posts/posts'
import { getTypeMeta } from '@/components/feed/feed-card-meta'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { topicLabel, type CourseModule } from '@/lib/courses/course-page'

function ModulePosts({ courseId, moduleNumber }: { courseId: string; moduleNumber: number }) {
  const { data, isLoading, isError, refetch } = usePostsControllerFindAll(
    { courseId, moduleNumber, limit: 100 },
    { query: { select: (r) => r.data } },
  )

  if (isLoading) return <p className="px-4 py-3 text-sm text-muted">Loading…</p>
  if (isError)
    return (
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm text-muted">
        <span>Couldn&apos;t load posts for this module.</span>
        <Button type="button" variant="quiet" size="sm" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    )

  return (
    <ul className="divide-y divide-line">
      {(data?.items ?? []).map((post) => {
        const meta = getTypeMeta(post.type)
        return (
          <li key={post.id}>
            <Link
              href={`/posts/${post.id}`}
              className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-accent"
            >
              <span className={cn('shrink-0 text-xs font-medium', meta.text)}>{meta.label}</span>
              <span className="min-w-0 truncate text-ink">{post.title ?? 'Untitled'}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function TopicRow({ courseId, module }: { courseId: string; module: CourseModule }) {
  const [open, setOpen] = useState(false)

  return (
    <li className="overflow-hidden rounded-card border border-line bg-surface">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="min-w-0 flex-1 truncate text-sm text-ink">{topicLabel(module)}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn('size-4 shrink-0 text-muted transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && <ModulePosts courseId={courseId} moduleNumber={module.moduleNumber} />}
    </li>
  )
}

function FailedModuleRow({
  moduleNumber,
  onRetry,
}: {
  moduleNumber: number
  onRetry?: (moduleNumber: number) => void
}) {
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface px-4 py-3 text-sm text-muted">
      <span>Module {moduleNumber} · couldn&apos;t load this module.</span>
      <Button type="button" variant="quiet" size="sm" onClick={() => onRetry?.(moduleNumber)}>
        Try again
      </Button>
    </li>
  )
}

function EmptyModuleRow({ courseId, moduleNumber }: { courseId: string; moduleNumber: number }) {
  return (
    <li className="rounded-card border border-line bg-surface px-4 py-3 text-sm text-muted">
      Module {moduleNumber} · nobody has shared yet ·{' '}
      <Link href={`/posts/new?courseId=${courseId}`} className="text-brand underline">
        Share the first note
      </Link>
    </li>
  )
}

export function TopicsList({
  courseId,
  modules,
  onRetry,
}: {
  courseId: string
  modules?: CourseModule[]
  onRetry?: (moduleNumber: number) => void
}) {
  return (
    <section aria-labelledby="course-topics" className="space-y-3">
      <div>
        <h2 id="course-topics" className="text-lg font-semibold text-ink">
          Topics
        </h2>
        <p className="text-sm text-muted">In module order</p>
      </div>

      {!modules ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <ul className="space-y-2">
          {modules.map((module) =>
            module.failed ? (
              <FailedModuleRow
                key={module.moduleNumber}
                moduleNumber={module.moduleNumber}
                onRetry={onRetry}
              />
            ) : module.total === 0 ? (
              <EmptyModuleRow
                key={module.moduleNumber}
                courseId={courseId}
                moduleNumber={module.moduleNumber}
              />
            ) : (
              <TopicRow key={module.moduleNumber} courseId={courseId} module={module} />
            ),
          )}
        </ul>
      )}
    </section>
  )
}
