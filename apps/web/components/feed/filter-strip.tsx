'use client'

import { cn } from '@/lib/utils'
import { useDepartmentsControllerFindAll } from '@/src/lib/api/generated/departments/departments'
import { useCoursesControllerFindAll } from '@/src/lib/api/generated/courses/courses'

export const typeFilters = ['ALL', 'NOTE', 'OLD_QUESTION'] as const
export type TypeFilter = (typeof typeFilters)[number]

const typeFilterLabel: Record<TypeFilter, string> = {
  ALL: 'ALL',
  NOTE: 'NOTES',
  OLD_QUESTION: 'PAST EXAMS',
}

interface FilterStripProps {
  activeFilter: TypeFilter
  onFilterChange: (filter: TypeFilter) => void
  selectedDeptId: string
  onDeptChange: (deptId: string) => void
  selectedCourseId: string
  onCourseChange: (courseId: string) => void
}

type ApiDept = { id: string; name: string }
type ApiCourse = { id: string; code: string; name: string; departmentId: string }

const selectClass =
  'h-8 px-2 pr-6 bg-card border border-border rounded-[6px] font-mono text-xs text-text-muted appearance-none cursor-pointer hover:border-amber/50 focus:outline-none focus:ring-1 focus:ring-amber transition-colors duration-150'

export function FilterStrip({
  activeFilter,
  onFilterChange,
  selectedDeptId,
  onDeptChange,
  selectedCourseId,
  onCourseChange,
}: FilterStripProps) {
  const { data: departments } = useDepartmentsControllerFindAll({
    query: { select: (r) => r.data as unknown as ApiDept[] },
  })

  const { data: coursesData } = useCoursesControllerFindAll(
    { limit: 100 },
    { query: { select: (r) => r.data as unknown as { items: ApiCourse[] } } },
  )
  const allCourses = coursesData?.items ?? []

  const filteredCourses = selectedDeptId
    ? allCourses.filter((c) => c.departmentId === selectedDeptId)
    : allCourses

  function handleDeptChange(deptId: string) {
    onDeptChange(deptId)
    onCourseChange('')
  }

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
            {typeFilterLabel[filter]}
          </button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="relative">
          <select
            value={selectedDeptId}
            onChange={(e) => handleDeptChange(e.target.value)}
            className={selectClass}
          >
            <option value="">All departments</option>
            {(departments ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div className="relative">
          <select
            value={selectedCourseId}
            onChange={(e) => onCourseChange(e.target.value)}
            className={selectClass}
          >
            <option value="">All courses</option>
            {filteredCourses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
