'use client'

import { use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useDepartmentsControllerFindOne } from '@/src/lib/api/generated/departments/departments'
import { useCoursesControllerFindAll } from '@/src/lib/api/generated/courses/courses'
import { useFeedStore } from '@/lib/store'
import { PageHeader } from '@/components/shared/page-header'

export default function DepartmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const setPendingFilter = useFeedStore((s) => s.setPendingFilter)

  const { data: dept } = useDepartmentsControllerFindOne(id, {
    query: { select: (r) => r.data },
  })

  const { data: coursesData } = useCoursesControllerFindAll(
    { departmentId: id, limit: 100 },
    { query: { select: (r) => r.data } },
  )

  const courses = coursesData?.items ?? []

  function handleCourseClick(courseId: string) {
    setPendingFilter(id, courseId)
    router.push('/')
  }

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title={dept?.name ?? 'Department'} />
      <div className="flex-1 bg-card">
        <div className="max-w-[700px] mx-auto px-6 py-6">
          <Link
            href="/departments"
            className="inline-flex items-center gap-1.5 font-mono text-xs text-text-muted hover:text-foreground transition-colors duration-150 mb-6"
          >
            <ArrowLeft className="size-3.5" strokeWidth={1.5} />
            All departments
          </Link>

          <div className="flex flex-col gap-2">
            {courses.map((course) => (
              <button
                key={course.id}
                onClick={() => handleCourseClick(course.id)}
                className="flex items-center gap-4 px-5 py-3.5 border border-border rounded-[6px] hover:border-amber/50 transition-colors duration-150 text-left w-full"
              >
                <span className="font-mono text-[13px] text-amber font-medium shrink-0">
                  {course.code}
                </span>
                <span className="text-sm text-foreground flex-1 min-w-0 truncate">
                  {course.name}
                </span>
              </button>
            ))}
            {courses.length === 0 && (
              <p className="font-mono text-sm text-text-muted py-8 text-center">
                No courses in this department.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
