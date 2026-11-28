'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import type { CourseModule } from '@/lib/courses/course-page'

interface CourseTopicsProps {
  courseId: string
  /** Undefined until every page of the course's posts has arrived. */
  modules: CourseModule[] | undefined
  /** Members only: guests can't share. */
  canShare: boolean
  isError: boolean
  onRetry: () => void
}

export function CourseTopics({ courseId, modules, canShare, isError, onRetry }: CourseTopicsProps) {
  const [open, setOpen] = useState<number | null>(null)
  const uid = useId()
  const headingId = `${uid}-h`

  return (
    <section
      aria-labelledby={headingId}
      className="grid min-w-0 gap-3.5 rounded-(--r) border-2 border-line bg-surface p-[18px]"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2.5">
        <h2 id={headingId} className="text-xl font-semibold tracking-[-0.01em]">
          Topics
        </h2>
        <span className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
          In lecture order
        </span>
      </div>
      {isError ? (
        <p className="text-sm text-muted-foreground">
          Couldn&apos;t load all topics.{' '}
          <button type="button" onClick={onRetry} className="font-semibold text-sky">
            Try again
          </button>
        </p>
      ) : !modules ? (
        <div className="grid gap-2" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : modules.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nobody has shared yet.
          {canShare && (
            <>
              {' '}
              <Link href={`/posts/new?courseId=${courseId}`} className="font-semibold text-sky">
                Share the first note
              </Link>
            </>
          )}
        </p>
      ) : (
        <ul className="grid gap-0.5">
          {modules.map((module) => {
            const isOpen = open === module.moduleNumber
            const panelId = `${uid}-${module.moduleNumber}`
            return (
              <li
                key={module.moduleNumber}
                className="border-t-2 border-surface-2 first:border-t-0"
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpen(isOpen ? null : module.moduleNumber)}
                  className="grid w-full grid-cols-[62px_minmax(0,1fr)_auto_18px] items-center gap-3 rounded-(--r-s) px-1.5 py-3 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 max-[560px]:grid-cols-[minmax(0,1fr)_auto_18px] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-surface-2"
                >
                  <span className="font-mono text-xs text-muted-foreground max-[560px]:hidden">
                    Module {module.moduleNumber}
                  </span>
                  <span className="min-w-0 font-medium">{module.newest.title}</span>
                  <span className="min-w-[76px] text-right text-xs font-semibold text-muted-foreground max-[560px]:hidden">
                    {module.count === 1 ? '1 post' : `${module.count} posts`}
                  </span>
                  <ChevronDown
                    aria-hidden
                    className={cn(
                      'size-[18px] text-muted-foreground transition-transform duration-200 ease-(--ease-out) motion-reduce:transition-none',
                      isOpen && 'rotate-180',
                    )}
                  />
                </button>
                <div
                  id={panelId}
                  inert={!isOpen}
                  className={cn(
                    'grid transition-[grid-template-rows] duration-[240ms] ease-(--ease-out) motion-reduce:transition-none',
                    isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                  )}
                >
                  <div className="min-h-0 overflow-hidden">
                    <ul className="grid justify-items-start gap-2.5 pr-1.5 pb-3.5 pl-20 max-[560px]:pl-1.5">
                      {module.posts.map((post) => (
                        <li key={post.id}>
                          <Link
                            href={`/posts/${post.id}`}
                            className="text-sm text-muted-foreground hover:text-ink hover:underline"
                          >
                            {post.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
