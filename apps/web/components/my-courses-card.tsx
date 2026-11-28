'use client'

import { useState } from 'react'
import Link from 'next/link'
import { coursesHref } from '@/components/navigation/navigation-config'
import { useMyCourses } from '@/components/my-courses/use-my-courses'
import { MyCoursesDialog } from '@/components/my-courses/my-courses-dialog'
import { formatAcademicYear } from '@/lib/utils'

/** The student's final course list for this academic year. */
export function MyCoursesCard() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const { department, yearLevel, data } = useMyCourses()
  if (!department || yearLevel === null || !data) return null
  const courses = data.final

  return (
    <section className="grid min-w-0 gap-2.5 rounded-(--r) border-2 border-line bg-surface p-[18px]">
      <h2 className="font-display text-lg font-bold">My courses</h2>
      <p className="-mt-1.5 text-[13px] text-muted-foreground">
        {formatAcademicYear(data.academicYear)} · {department.name} · Year {yearLevel}
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
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <button
          type="button"
          className="py-1 text-[13px] font-semibold text-brand-edge"
          onClick={() => setDialogOpen(true)}
        >
          Change courses
        </button>
        <Link
          href={coursesHref(department.id)}
          className="inline-flex py-1 text-[13px] font-semibold text-brand-edge"
        >
          All department courses
        </Link>
      </div>
      {/* Mounting only while open resets the draft from the latest saved list. */}
      {dialogOpen && (
        <MyCoursesDialog courses={data} departmentId={department.id} onOpenChange={setDialogOpen} />
      )}
    </section>
  )
}
