'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCoursesControllerFindAll } from '@/src/lib/api/generated/courses/courses'

const EMPTY_SELECT_VALUE = '__empty__'

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

  const allCourses = coursesData?.items ?? []
  const loading = meLoading || coursesLoading

  const selectedYearNumber = Number(selectedYear)
  const hasSelectedYear = selectedYear !== '' && !Number.isNaN(selectedYearNumber)

  const filteredCourses = hasSelectedYear
    ? allCourses.filter(
        (course) => course.yearLevel == null || course.yearLevel === selectedYearNumber,
      )
    : []

  return (
    <div>
      <h2 className="text-[22px] font-semibold text-foreground mb-6">Which course is this for?</h2>

      <div className="flex flex-col gap-4">
        <div>
          <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
            Year
          </label>
          <Select
            value={selectedYear || EMPTY_SELECT_VALUE}
            onValueChange={(value) => onYearChange(value === EMPTY_SELECT_VALUE ? '' : value)}
          >
            <SelectTrigger className="w-full h-[42px] bg-card border-border rounded-[6px] text-sm text-foreground focus-visible:ring-2 focus-visible:ring-amber">
              <SelectValue placeholder="Select year..." />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value={EMPTY_SELECT_VALUE}>Select year...</SelectItem>
              {[1, 2, 3, 4, 5, 6].map((year) => (
                <SelectItem key={year} value={String(year)}>
                  Year {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            <>
              <Select
                value={selectedCourse || EMPTY_SELECT_VALUE}
                onValueChange={(value) => onCourseChange(value === EMPTY_SELECT_VALUE ? '' : value)}
              >
                <SelectTrigger
                  className="w-full h-[42px] bg-card border-border rounded-[6px] text-sm text-foreground focus-visible:ring-2 focus-visible:ring-amber"
                  disabled={!hasSelectedYear}
                >
                  <SelectValue
                    placeholder={hasSelectedYear ? 'Select course...' : 'Select year first...'}
                  />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value={EMPTY_SELECT_VALUE}>Select course...</SelectItem>
                  {filteredCourses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.code} — {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasSelectedYear && filteredCourses.length === 0 && (
                <p className="font-mono text-xs text-text-muted mt-2">
                  No courses found for Year {selectedYearNumber}.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
