'use client'

import { useMemo } from 'react'
import { SearchSelect } from '@/components/ui/search-select'
import { useCoursesControllerFindAll } from '@/src/lib/api/generated/courses/courses'
import { useDepartmentsControllerFindAll } from '@/src/lib/api/generated/departments/departments'

interface CourseSelectorProps {
  deptId: string
  yearLevel: string
  courseId: string
  onDeptChange: (v: string) => void
  onYearChange: (v: string) => void
  onCourseChange: (v: string) => void
  disabled: boolean
  /** Restrict the course list to courses that already have a saved module outline. */
  onlyWithOutline?: boolean
}

const yearOptions = [1, 2, 3, 4, 5, 6].map((y) => ({
  value: String(y),
  label: `Year ${y}`,
}))

export function CourseSelector({
  deptId,
  yearLevel,
  courseId,
  onDeptChange,
  onYearChange,
  onCourseChange,
  disabled,
  onlyWithOutline,
}: CourseSelectorProps) {
  const { data: departments } = useDepartmentsControllerFindAll({
    query: { select: (r) => r.data },
  })

  const { data: coursesData } = useCoursesControllerFindAll(
    {
      limit: 100,
      ...(deptId ? { departmentId: deptId } : {}),
      ...(onlyWithOutline ? { hasOutline: true } : {}),
    },
    { query: { select: (r) => r.data } },
  )

  const courseOptions = useMemo(() => {
    const allCourses = coursesData?.items ?? []
    const yearNum = Number(yearLevel)
    return allCourses
      .filter((c) => !yearLevel || c.yearLevel == null || c.yearLevel === yearNum)
      .map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))
  }, [coursesData?.items, yearLevel])

  const deptOptions = useMemo(
    () => (departments ?? []).map((d) => ({ value: d.id, label: d.name })),
    [departments],
  )

  return (
    <section className="space-y-4">
      <h2 className="text-[22px] font-semibold text-foreground">Which course is this for?</h2>
      <div className="flex flex-col gap-4">
        <div>
          <label className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground block mb-1.5">
            Department
          </label>
          <SearchSelect
            options={deptOptions}
            value={deptId}
            onChange={(v) => {
              onDeptChange(v)
              onCourseChange('')
              onYearChange('')
            }}
            placeholder="All departments"
            disabled={disabled}
          />
        </div>
        <div>
          <label className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground block mb-1.5">
            Year Level
          </label>
          <SearchSelect
            options={yearOptions}
            value={yearLevel}
            onChange={(v) => {
              onYearChange(v)
              onCourseChange('')
            }}
            placeholder="All years"
            disabled={disabled}
          />
        </div>
        <div>
          <label className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground block mb-1.5">
            Course
          </label>
          <SearchSelect
            options={courseOptions}
            value={courseId}
            onChange={onCourseChange}
            placeholder={courseOptions.length === 0 ? 'No courses found' : 'Select a course…'}
            disabledPlaceholder="Select a course…"
            disabled={disabled || courseOptions.length === 0}
          />
        </div>
      </div>
    </section>
  )
}
