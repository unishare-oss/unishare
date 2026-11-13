'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { useFeedStore } from '@/lib/store'
import { useCoursesControllerFindAll } from '@/src/lib/api/generated/courses/courses'
import { coursesHref } from '@/components/navigation/navigation-config'

/** The member's department courses for their year. There is no enrolment, so this stands in. */
export function MyCoursesCard({ onSelectCourse }: { onSelectCourse?: () => void }) {
  const { user } = useAuth()
  const { setSelectedDeptId, setSelectedYear, setSelectedCourseId } = useFeedStore()
  const department = user?.department
  const yearLevel = user?.yearLevel ?? null
  const { data } = useCoursesControllerFindAll(
    { departmentId: department?.id, limit: 100 },
    {
      query: { select: (response) => response.data, enabled: !!department && yearLevel !== null },
    },
  )
  const courses = (data?.items ?? []).filter((course) => course.yearLevel === yearLevel)
  if (!department || yearLevel === null || courses.length === 0) return null

  // The feed reads its pending filter only on mount, so apply the filter directly. The course
  // goes last because changing the department or year clears it.
  function showCourse(courseId: string) {
    setSelectedDeptId(department!.id)
    setSelectedYear(yearLevel)
    setSelectedCourseId(courseId)
    onSelectCourse?.()
  }

  return (
    <section className="grid min-w-0 gap-2.5 rounded-(--r) border-2 border-line bg-surface p-[18px]">
      <h2 className="font-display text-lg font-bold">My courses</h2>
      <p className="-mt-1.5 text-[13px] text-muted-foreground">
        {department.name} · Year {yearLevel}
      </p>
      <ul className="grid gap-0.5">
        {courses.map((course) => (
          <li key={course.id}>
            <button
              type="button"
              onClick={() => showCourse(course.id)}
              className="-mx-2.5 grid w-[calc(100%+20px)] gap-0.5 rounded-(--r-s) px-2.5 py-2 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-surface-2"
            >
              <b className="text-sm">{course.code}</b>
              <small className="text-xs leading-[1.3] text-muted-foreground">{course.name}</small>
            </button>
          </li>
        ))}
      </ul>
      <Link
        href={coursesHref(department.id)}
        className="inline-flex py-1 text-[13px] font-semibold text-brand-edge"
      >
        All department courses
      </Link>
    </section>
  )
}
