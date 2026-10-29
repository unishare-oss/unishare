'use client'

import { useMemo } from 'react'
import { SearchSelect } from '@/components/ui/search-select'
import { useCoursesControllerFindAll } from '@/src/lib/api/generated/courses/courses'
import { useDepartmentsControllerFindAll } from '@/src/lib/api/generated/departments/departments'
import { useUniversitiesControllerFindAll } from '@/src/lib/api/generated/universities/universities'

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
  // Admins write quizzes for every university, not only their own
  const { data: departments } = useDepartmentsControllerFindAll(undefined, {
    query: { select: (r) => r.data },
  })
  const { data: universities, isError: universitiesFailed } = useUniversitiesControllerFindAll({
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

  // Universities share department names, so each label names its university: the short
  // name unless two universities share it, plus the faculty when a name repeats inside one.
  // Empty until universities load, so no ambiguous option is ever offered.
  const deptOptions = useMemo(() => {
    if (!universities || !departments) return []
    const shortNameCount = new Map<string, number>()
    for (const u of universities) {
      shortNameCount.set(u.shortName, (shortNameCount.get(u.shortName) ?? 0) + 1)
    }
    const uniLabel = new Map(
      universities.map((u) => [u.id, shortNameCount.get(u.shortName) === 1 ? u.shortName : u.name]),
    )
    const nameKey = (d: (typeof departments)[number]) => `${d.faculty.universityId}:${d.name}`
    const nameCount = new Map<string, number>()
    for (const d of departments) nameCount.set(nameKey(d), (nameCount.get(nameKey(d)) ?? 0) + 1)

    return departments.map((d) => {
      const where = [
        nameCount.get(nameKey(d))! > 1 ? d.faculty.name : null,
        uniLabel.get(d.faculty.universityId),
      ]
      return { value: d.id, label: `${d.name} (${where.filter(Boolean).join(', ')})` }
    })
  }, [departments, universities])

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
            disabledPlaceholder={
              deptOptions.length ? undefined : universitiesFailed ? 'Unavailable' : 'Loading…'
            }
            disabled={disabled || deptOptions.length === 0}
          />
          {universitiesFailed && (
            <p className="mt-1.5 text-xs text-destructive">
              Couldn&apos;t load universities. Reload to pick a department.
            </p>
          )}
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
