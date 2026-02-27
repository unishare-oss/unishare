'use client'

import { cn } from '@/lib/utils'
import { departments, courses } from '@/lib/mock-data'

export const typeFilters = ['ALL', 'NOTES', 'PAST EXAMS'] as const
export type TypeFilter = (typeof typeFilters)[number]

interface FilterStripProps {
  activeFilter: TypeFilter
  onFilterChange: (filter: TypeFilter) => void
  selectedDept: string
  onDeptChange: (dept: string) => void
  selectedCourse: string
  onCourseChange: (course: string) => void
}

const selectClass =
  'h-8 px-2 pr-6 bg-card border border-border rounded-[6px] font-mono text-xs text-text-muted appearance-none cursor-pointer hover:border-amber/50 focus:outline-none focus:ring-1 focus:ring-amber transition-colors duration-150'

export function FilterStrip({
  activeFilter,
  onFilterChange,
  selectedDept,
  onDeptChange,
  selectedCourse,
  onCourseChange,
}: FilterStripProps) {
  const filteredCourses = selectedDept
    ? courses.filter((c) => {
        const dept = departments.find((d) => d.name === selectedDept)
        return dept ? c.departmentId === dept.id : true
      })
    : courses

  return (
    <div className="border-b border-border bg-card px-6 py-3 flex items-center gap-6">
      <div className="flex items-center gap-1">
        {typeFilters.map((filter) => (
          <button
            key={filter}
            onClick={() => onFilterChange(filter)}
            className={cn(
              'font-mono text-xs uppercase tracking-wider px-3 py-1.5 transition-colors duration-150 border-b-2',
              activeFilter === filter
                ? 'border-amber text-amber font-medium'
                : 'border-transparent text-text-muted hover:text-foreground',
            )}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="relative">
          <select
            value={selectedDept}
            onChange={(e) => onDeptChange(e.target.value)}
            className={selectClass}
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div className="relative">
          <select
            value={selectedCourse}
            onChange={(e) => onCourseChange(e.target.value)}
            className={selectClass}
          >
            <option value="">All courses</option>
            {filteredCourses.map((c) => (
              <option key={c.id} value={c.code}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
