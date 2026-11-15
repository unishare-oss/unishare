'use client'

import { use, useId, useMemo } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { COURSE_POSTS_LIMIT, useAllCoursePosts } from '@/hooks/use-all-course-posts'
import { useCoursesControllerFindOne } from '@/src/lib/api/generated/courses/courses'
import { usePostsControllerFindAll } from '@/src/lib/api/generated/posts/posts'
import type { PostEntity } from '@/src/lib/api/generated/unishareAPI.schemas'
import { groupByModule } from '@/lib/courses/course-page'
import { PageRail } from '@/components/page-rail'
import { Noto } from '@/components/noto/noto'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { CourseTopics } from '@/components/course/course-topics'
import { MaterialsShelf } from '@/components/course/materials-shelf'
import { CourseExamCard } from '@/components/course/course-exam-card'

function useTotal(courseId: string, type: PostEntity['type']) {
  const { data } = usePostsControllerFindAll(
    { courseId, type, limit: 1 },
    { query: { select: (response) => response.data.total } },
  )
  return data
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export default function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const upNextId = useId()
  const { isAuthenticated } = useAuth()
  const {
    data: course,
    isPending,
    isError,
  } = useCoursesControllerFindOne(id, {
    query: { select: (response) => response.data },
  })
  const notes = useTotal(id, 'NOTE')
  const exams = useTotal(id, 'OLD_QUESTION')
  const exercises = useTotal(id, 'EXERCISE')
  const { data: firstPage } = usePostsControllerFindAll(
    { courseId: id, limit: COURSE_POSTS_LIMIT },
    { query: { select: (response) => response.data } },
  )
  const all = useAllCoursePosts(id, firstPage)
  const modules = useMemo(() => (all.posts ? groupByModule(all.posts) : undefined), [all.posts])
  // Page 1 holds only the newest posts, so name the highest module from every page once loaded.
  const upNext = useMemo(() => {
    const grouped = modules ?? groupByModule(firstPage?.items ?? [])
    return grouped[grouped.length - 1]
  }, [modules, firstPage])

  if (isPending) {
    return (
      <PageRail>
        <Skeleton className="h-40 w-full" />
      </PageRail>
    )
  }
  if (isError || !course) {
    return (
      <PageRail>
        <p className="text-sm text-muted-foreground">This course could not be found.</p>
      </PageRail>
    )
  }

  const counts =
    notes === undefined || exams === undefined || exercises === undefined
      ? undefined
      : { notes, exams, exercises }
  const semester = [course.code, course.yearLevel ? `Year ${course.yearLevel}` : null]
    .filter(Boolean)
    .join(' · ')

  return (
    <PageRail
      rail={isAuthenticated && <CourseExamCard courseId={id} departmentId={course.department.id} />}
    >
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted-foreground"
      >
        <Link href="/feed" className="font-medium text-sky hover:underline">
          Today
        </Link>
        <span aria-hidden>/</span>
        <Link
          href={`/departments/${course.department.id}`}
          className="font-medium text-sky hover:underline"
        >
          Courses
        </Link>
        <span aria-hidden>/</span>
        <span aria-current="page">{course.code}</span>
      </nav>

      <header className="grid gap-1.5">
        <span className="font-mono text-xs text-muted-foreground">{semester}</span>
        <h1 className="text-[clamp(28px,4vw,38px)] leading-[1.08] font-semibold tracking-[-0.024em]">
          {course.name}
        </h1>
        {counts ? (
          <p className="text-sm text-muted-foreground">
            {`${plural(counts.notes, 'note', 'notes')} · ${plural(counts.exams, 'old exam', 'old exams')} · ${plural(counts.exercises, 'exercise', 'exercises')}`}
          </p>
        ) : (
          <Skeleton className="h-5 w-64 max-w-full" />
        )}
        {isAuthenticated && (
          <div className="mt-1.5 flex flex-wrap gap-2">
            <Button size="sm" asChild>
              <Link href={`/posts/new?courseId=${id}`}>
                <Plus aria-hidden />
                Share a note
              </Link>
            </Button>
          </div>
        )}
      </header>

      {upNext && (
        <section
          aria-labelledby={upNextId}
          className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 rounded-(--r) border-2 border-brand bg-brand-soft p-[18px] min-[621px]:grid-cols-[auto_minmax(0,1fr)_auto]"
        >
          <div className="-mt-3 -mr-2.5 -mb-2.5 -ml-2.5 size-[76px] min-[621px]:-mt-[22px] min-[621px]:-mr-4 min-[621px]:-mb-[18px] min-[621px]:-ml-[18px] min-[621px]:size-28">
            <Noto mood="point" />
          </div>
          <div>
            <span className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
              Up next
            </span>
            <h2 id={upNextId} className="font-display text-2xl font-bold">
              {upNext.newest.title}
            </h2>
            <p className="mt-0.5 text-sm">
              Module {upNext.moduleNumber}, the newest one with notes.
            </p>
          </div>
          <Button variant="brand" asChild className="col-span-full min-[621px]:col-auto">
            <Link href={`/posts/${upNext.newest.id}`}>Read the note</Link>
          </Button>
        </section>
      )}

      <CourseTopics
        courseId={id}
        canShare={isAuthenticated}
        modules={modules}
        isError={all.isError}
        onRetry={all.retry}
      />
      <MaterialsShelf posts={firstPage?.items} courseCode={course.code} counts={counts} />
    </PageRail>
  )
}
