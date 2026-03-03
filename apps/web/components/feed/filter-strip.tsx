'use client'

import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

const ALL = '__all__'

export function FilterStrip({
  activeFilter,
  onFilterChange,
  selectedDeptId,
  onDeptChange,
  selectedCourseId,
  onCourseChange,
}: FilterStripProps) {
  const { data: departments } = useDepartmentsControllerFindAll({
    query: { select: (r) => r.data },
  })

  const { data: coursesData } = useCoursesControllerFindAll(
    { limit: 100 },
    { query: { select: (r) => r.data } },
  )
  const allCourses = coursesData?.items ?? []

  const filteredCourses = selectedDeptId
    ? allCourses.filter((c) => c.departmentId === selectedDeptId)
    : allCourses

  function handleDeptChange(value: string) {
    const deptId = value === ALL ? '' : value
    onDeptChange(deptId)
    onCourseChange('')
  }

  function handleCourseChange(value: string) {
    onCourseChange(value === ALL ? '' : value)
  }

  return (
    <div className="border-b border-border bg-card flex flex-col lg:flex-row lg:items-center lg:px-6 lg:py-3 lg:gap-6">
      <div className="flex items-center gap-1 px-4 pt-3 pb-0 lg:p-0 overflow-x-auto">
        {typeFilters.map((filter) => (
          <button
            key={filter}
            onClick={() => onFilterChange(filter)}
            className={cn(
              'font-mono text-xs uppercase tracking-wider px-3 py-1.5 transition-colors duration-150 border-b-2 shrink-0',
              activeFilter === filter
                ? 'border-amber text-amber font-medium'
                : 'border-transparent text-text-muted hover:text-foreground',
            )}
          >
            {typeFilterLabel[filter]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 px-4 py-3 lg:flex lg:p-0 lg:ml-auto">
        <Select value={selectedDeptId || ALL} onValueChange={handleDeptChange}>
          <SelectTrigger
            size="sm"
            className="font-mono text-xs text-text-muted w-full lg:w-[140px]"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All departments</SelectItem>
            {(departments ?? []).map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedCourseId || ALL} onValueChange={handleCourseChange}>
          <SelectTrigger
            size="sm"
            className="font-mono text-xs text-text-muted w-full lg:w-[140px]"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All courses</SelectItem>
            {filteredCourses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.code} — {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
