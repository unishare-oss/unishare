'use client'

import { use } from 'react'
import Link from 'next/link'
import { useQueries } from '@tanstack/react-query'
import { useCoursesControllerFindOne } from '@/src/lib/api/generated/courses/courses'
import {
  getPostsControllerFindAllQueryOptions,
  usePostsControllerFindAll,
} from '@/src/lib/api/generated/posts/posts'
import { PostType } from '@/src/lib/api/generated/unishareAPI.schemas'
import { PageHeader } from '@/components/shared/page-header'
import { PageRail } from '@/components/page-rail'
import { UpNextCard } from '@/components/course/up-next-card'
import { TopicsList } from '@/components/course/topics-list'
import { MaterialsShelf } from '@/components/course/materials-shelf'
import { ExamCard } from '@/components/course/exam-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { deriveSemester } from '@/lib/posts/share-defaults'
import { COURSE_MODULES, plural, type CourseModule } from '@/lib/courses/course-page'

export default function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const { data: course, isLoading } = useCoursesControllerFindOne(id, {
    query: { select: (r) => r.data },
  })

  const moduleQueries = useQueries({
    queries: COURSE_MODULES.map((moduleNumber) =>
      getPostsControllerFindAllQueryOptions(
        { courseId: id, moduleNumber, type: PostType.NOTE, limit: 1 },
        { query: { select: (r) => r.data } },
      ),
    ),
  })

  const notesQuery = usePostsControllerFindAll(
    { courseId: id, type: PostType.NOTE, limit: 1 },
    { query: { select: (r) => r.data } },
  )
  const oldExamsQuery = usePostsControllerFindAll(
    { courseId: id, type: PostType.OLD_QUESTION, limit: 1 },
    { query: { select: (r) => r.data } },
  )
  const exercisesQuery = usePostsControllerFindAll(
    { courseId: id, type: PostType.EXERCISE, limit: 1 },
    { query: { select: (r) => r.data } },
  )

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-[calc(100dvh-var(--mobile-topbar-h,0px))]">
        <PageHeader title="Course" />
        <div className="mx-auto w-full max-w-[1440px] space-y-4 px-4 py-6 md:px-6">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="flex flex-col min-h-[calc(100dvh-var(--mobile-topbar-h,0px))]">
        <PageHeader title="Course" />
        <div className="mx-auto w-full max-w-[1440px] px-4 py-6 md:px-6">
          <p className="text-sm text-muted">This course could not be found.</p>
        </div>
      </div>
    )
  }

  // Undefined while the module counts load, so the Topics and Up next skeletons show.
  const modules: CourseModule[] | undefined = moduleQueries.some((q) => q.isPending)
    ? undefined
    : COURSE_MODULES.map((moduleNumber, index) => {
        const data = moduleQueries[index].data
        return {
          moduleNumber,
          total: data?.total ?? 0,
          newest: data?.items[0],
          failed: moduleQueries[index].isError,
        }
      })

  // Same NOTE total as the Notes chip, so the header and the chip never disagree.
  const notesTotal = notesQuery.data?.total ?? 0
  const oldExamTotal = oldExamsQuery.data?.total ?? 0
  const exercisesTotal = exercisesQuery.data?.total ?? 0
  const semester = deriveSemester(new Date())
  const eyebrow = [
    course.code,
    course.yearLevel ? `Year ${course.yearLevel}` : null,
    `Semester ${semester}`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="calm flex flex-col min-h-[calc(100dvh-var(--mobile-topbar-h,0px))]">
      <PageHeader title={course.name} />

      <div className="flex-1 bg-background">
        <div className="mx-auto max-w-[1440px] px-4 py-4 md:px-6 md:py-6">
          <PageRail
            rail={
              <div className="space-y-6">
                <ExamCard courseId={id} departmentId={course.department.id} />
                <section aria-labelledby="course-helpers" className="space-y-2">
                  <h2 id="course-helpers" className="font-semibold text-ink">
                    Helpers in this course
                  </h2>
                  <p className="text-sm text-muted">Coming soon.</p>
                </section>
                <section aria-labelledby="course-activity" className="space-y-2">
                  <h2 id="course-activity" className="font-semibold text-ink">
                    Your activity
                  </h2>
                  <p className="text-sm text-muted">Coming soon.</p>
                </section>
              </div>
            }
          >
            <header className="space-y-2">
              <p className="font-mono text-xs uppercase tracking-widest text-muted">{eyebrow}</p>
              <h1 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">
                {course.name}
              </h1>
              <p className="text-sm text-muted">
                {plural(notesTotal, 'note')} · {plural(oldExamTotal, 'old exam')}
              </p>
              <Button asChild variant="quiet" size="sm">
                <Link href={`/posts/new?courseId=${id}`}>+ Share a note</Link>
              </Button>
            </header>

            <div className="mt-8 space-y-10">
              <UpNextCard courseId={id} modules={modules} />
              <TopicsList
                courseId={id}
                modules={modules}
                onRetry={(moduleNumber) =>
                  moduleQueries[COURSE_MODULES.indexOf(moduleNumber as 1 | 2 | 3)]?.refetch()
                }
              />
              <MaterialsShelf
                courseId={id}
                counts={{
                  all: notesTotal + oldExamTotal + exercisesTotal,
                  notes: notesTotal,
                  oldExams: oldExamTotal,
                  exercises: exercisesTotal,
                }}
                featured={oldExamsQuery.data?.items[0]}
              />
            </div>
          </PageRail>
        </div>
      </div>
    </div>
  )
}
