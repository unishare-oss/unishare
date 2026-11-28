'use client'

import { useState } from 'react'
import { CalendarCheck } from 'lucide-react'
import { MyCoursesDialog } from '@/components/my-courses/my-courses-dialog'
import { useMyCourses, useSaveMyCourses } from '@/components/my-courses/use-my-courses'
import { Button } from '@/components/ui/button'
import { formatAcademicYear } from '@/lib/utils'

/** Asks the student to check their courses once per academic year. */
export function CourseCheckCard() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const { department, yearLevel, data } = useMyCourses()
  const save = useSaveMyCourses('Thanks. Reminders follow these courses this year.')
  if (!department || yearLevel === null || !data || data.confirmed) return null
  const empty = data.automatic.length === 0

  return (
    <section
      aria-labelledby="course-check-heading"
      className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 rounded-(--r) border-2 border-line bg-surface p-[18px] min-[621px]:grid-cols-[auto_minmax(0,1fr)_auto]"
    >
      <span className="grid size-[52px] place-items-center rounded-full bg-brand-soft text-brand-edge">
        <CalendarCheck className="size-[26px]" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <h2 id="course-check-heading" className="font-display text-[22px] font-bold">
          {empty ? 'No courses found for your year' : 'New year, new courses'}
        </h2>
        <p className="mt-0.5 text-[14px] text-muted-foreground">
          {empty
            ? 'Add yours from your department, so you get reminders for your exams.'
            : `Check your ${formatAcademicYear(data.academicYear)} courses so you only get reminders for your own exams.`}
        </p>
      </div>
      <div className="col-span-full flex flex-wrap gap-2.5 min-[621px]:col-auto min-[621px]:justify-end">
        {!empty && (
          <Button
            type="button"
            size="sm"
            className="max-[620px]:flex-1"
            disabled={save.isPending}
            onClick={() => save.mutate({ data: { courseIds: data.final.map((c) => c.id) } })}
          >
            Looks right
          </Button>
        )}
        <Button
          type="button"
          variant="brand"
          className="max-[620px]:flex-1"
          onClick={() => setDialogOpen(true)}
        >
          {empty ? 'Add courses' : 'Check courses'}
        </Button>
      </div>
      {dialogOpen && (
        <MyCoursesDialog courses={data} departmentId={department.id} onOpenChange={setDialogOpen} />
      )}
    </section>
  )
}
