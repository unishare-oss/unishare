'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { useMyCoursesControllerGetMine } from '@/src/lib/api/generated/users/users'
import { coursesHref } from '@/components/navigation/navigation-config'

/** The student's final course list for this academic year. */
export function MyCoursesCard() {
  const { user } = useAuth()
  const department = user?.department
  const yearLevel = user?.yearLevel ?? null
  const { data } = useMyCoursesControllerGetMine({
    query: { select: (response) => response.data, enabled: !!department && yearLevel !== null },
  })
  if (!department || yearLevel === null || !data) return null
  const courses = data.final

  return (
    <section className="grid min-w-0 gap-2.5 rounded-(--r) border-2 border-line bg-surface p-[18px]">
      <h2 className="font-display text-lg font-bold">My courses</h2>
      <p className="-mt-1.5 text-[13px] text-muted-foreground">
        {department.name} · Year {yearLevel}
      </p>
      {courses.length === 0 ? (
        <p className="text-sm text-muted-foreground">No courses found for your year — add yours</p>
      ) : (
        <ul className="grid gap-0.5">
          {courses.map((course) => (
            <li key={course.id}>
              <Link
                href={`/courses/${course.id}`}
                className="-mx-2.5 grid w-[calc(100%+20px)] gap-0.5 rounded-(--r-s) px-2.5 py-2 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-surface-2"
              >
                <b className="text-sm">{course.code}</b>
                <small className="text-xs leading-[1.3] text-muted-foreground">{course.name}</small>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link
        href={coursesHref(department.id)}
        className="inline-flex py-1 text-[13px] font-semibold text-brand-edge"
      >
        All department courses
      </Link>
    </section>
  )
}
