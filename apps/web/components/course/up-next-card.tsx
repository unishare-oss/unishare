'use client'

import Link from 'next/link'
import { Noto } from '@/components/noto/noto'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { topicLabel, type CourseModule } from '@/lib/courses/course-page'

/** The newest module (the highest number) that has notes, named like its Topics row. */
export function UpNextCard({ courseId, modules }: { courseId: string; modules?: CourseModule[] }) {
  if (!modules) return <Skeleton className="h-28 w-full" />

  const current = [...modules].reverse().find((module) => module.newest)

  if (!current?.newest) {
    return (
      <section className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5 sm:flex-row sm:items-center">
        <Noto mood="sleep" className="w-20 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">Nobody has shared a note yet</p>
          <p className="text-sm text-muted">Share the first note for this course.</p>
        </div>
        <Button asChild variant="brand">
          <Link href={`/posts/new?courseId=${courseId}`}>Share the first note</Link>
        </Button>
      </section>
    )
  }

  return (
    <section
      aria-labelledby="course-up-next"
      className="flex flex-col gap-4 rounded-card border border-brand/40 bg-brand-soft p-5 sm:flex-row sm:items-center"
    >
      <Noto mood="point" className="w-20 shrink-0" />
      <div className="min-w-0 flex-1">
        <p id="course-up-next" className="font-mono text-xs uppercase tracking-widest text-muted">
          Up next
        </p>
        <p className="mt-1 truncate font-semibold text-ink">{topicLabel(current)}</p>
      </div>
      <Button asChild variant="brand">
        <Link href={`/posts/${current.newest.id}`}>Open the note</Link>
      </Button>
    </section>
  )
}
