'use client'

import { useCoursesControllerFindAll } from '@/src/lib/api/generated/courses/courses'
import { useMemo } from 'react'
import { SearchSelect } from '@/components/ui/search-select'

interface CourseStepProps {
  selectedYear: string
  onYearChange: (year: string) => void
  selectedCourse: string
  onCourseChange: (course: string) => void
  departmentId?: string
  meLoading?: boolean
}

export function CourseStep({
  selectedYear,
  onYearChange,
  selectedCourse,
  onCourseChange,
  departmentId,
  meLoading,
}: CourseStepProps) {
  const { data: coursesData, isLoading: coursesLoading } = useCoursesControllerFindAll(
    { departmentId, limit: 100 },
    { query: { enabled: !!departmentId, select: (r) => r.data } },
  )

  const loading = meLoading || coursesLoading

  const selectedYearNumber = Number(selectedYear)
  const hasSelectedYear = selectedYear !== '' && !Number.isNaN(selectedYearNumber)

  const courseOptions = useMemo(() => {
    const allCourses = coursesData?.items ?? []

    if (!hasSelectedYear) return []

    return allCourses
      .filter((course) => course.yearLevel == null || course.yearLevel === selectedYearNumber)
      .map((course) => ({
        value: course.id,
        label: `${course.code} — ${course.name}`,
      }))
  }, [coursesData, hasSelectedYear, selectedYearNumber])

  return (
    <div>
      <h2 className="text-[22px] font-semibold text-foreground mb-6">Which course is this for?</h2>

      <div className="flex flex-col gap-4">
        <div>
          <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
            Year
          </label>
          <SearchSelect
            options={[1, 2, 3, 4, 5, 6].map((year) => ({
              value: String(year),
              label: `Year ${year}`,
            }))}
            value={selectedYear}
            onChange={onYearChange}
            placeholder="Select year..."
          />
        </div>

        <div>
          <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
            Course
          </label>
          {loading ? (
            <div className="h-[42px] bg-muted animate-pulse rounded-[6px]" />
          ) : !departmentId ? (
            <p className="font-mono text-sm text-text-muted py-4">
              Please{' '}
              <a href="/profile" className="text-amber underline underline-offset-2">
                set your department
              </a>{' '}
              in your profile to select a course.
            </p>
          ) : (
            <SearchSelect
              options={courseOptions}
              value={selectedCourse}
              onChange={onCourseChange}
              placeholder="Select course..."
              disabledPlaceholder="Select year first..."
              disabled={!hasSelectedYear}
            />
          )}
        </div>
      </div>
    </div>
  )
}
