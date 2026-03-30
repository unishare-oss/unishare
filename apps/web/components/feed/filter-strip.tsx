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
import { type TypeFilter } from '@/lib/store'
import { PostType } from '@/src/lib/api/generated/unishareAPI.schemas'

import { TrendingUp, Clock } from 'lucide-react'

export type SortType = 'recent' | 'trending'

export const typeFilters: TypeFilter[] = ['ALL', PostType.NOTE, PostType.ASSIGNMENT]

const typeFilterLabel: Record<TypeFilter, string> = {
  ALL: 'ALL',
  NOTE: 'NOTES',
  OLD_QUESTION: 'PAST EXAMS',
  ASSIGNMENT: 'ASSIGNMENTS',
}

interface FilterStripProps {
  activeFilter: TypeFilter
  onFilterChange: (filter: TypeFilter) => void
  selectedDeptId: string
  onDeptChange: (deptId: string) => void
  selectedYear: number | null
  onYearChange: (year: number | null) => void
  selectedCourseId: string
  onCourseChange: (courseId: string) => void
  selectedModuleNumber: number | null
  onModuleChange: (moduleNumber: number | null) => void
  sortType?: SortType
  onSortChange?: (sort: SortType) => void
}

const ALL = '__all__'

export function FilterStrip({
  activeFilter,
  onFilterChange,
  selectedDeptId,
  onDeptChange,
  selectedYear,
  onYearChange,
  selectedCourseId,
  onCourseChange,
  selectedModuleNumber,
  onModuleChange,
  sortType = 'recent',
  onSortChange,
}: FilterStripProps) {
  const { data: departments } = useDepartmentsControllerFindAll({
    query: { select: (r) => r.data },
  })

  const { data: coursesData } = useCoursesControllerFindAll(
    { limit: 100, ...(selectedDeptId ? { departmentId: selectedDeptId } : {}) },
    { query: { select: (r) => r.data } },
  )
  const allCourses = coursesData?.items ?? []

  const filteredCourses = allCourses.filter((c) => {
    const deptOk = selectedDeptId ? c.department.id === selectedDeptId : true
    const yearOk = selectedYear === null ? true : c.yearLevel === selectedYear
    return deptOk && yearOk
  })

  const selectedDeptLabel = selectedDeptId
    ? ((departments ?? []).find((d) => d.id === selectedDeptId)?.name ?? '')
    : 'All departments'

  const selectedYearLabel = selectedYear === null ? 'All years' : `Year ${selectedYear}`

  const selectedCourseLabel = selectedCourseId
    ? (() => {
        const c = allCourses.find((x) => x.id === selectedCourseId)
        return c ? `${c.code} — ${c.name}` : ''
      })()
    : 'All courses'

  function handleDeptChange(value: string) {
    const deptId = value === ALL ? '' : value
    onDeptChange(deptId)
    onCourseChange('')
  }

  function handleYearChange(value: string) {
    const year = value === ALL ? null : Number(value)
    onYearChange(year)
    onCourseChange('')
  }

  function handleCourseChange(value: string) {
    onCourseChange(value === ALL ? '' : value)
  }

  function handleModuleChange(value: string) {
    onModuleChange(value === ALL ? null : Number(value))
  }

  return (
    <div className="sticky top-17 z-10 border-b border-border bg-card flex flex-col">
      {onSortChange && (
        <div className="flex border-b border-border px-6">
          <button
            onClick={() => onSortChange('recent')}
            className={cn(
              'flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider px-4 py-3 border-b-2 -mb-px transition-colors duration-150',
              sortType === 'recent'
                ? 'border-amber text-amber font-medium'
                : 'border-transparent text-text-muted hover:text-foreground',
            )}
          >
            <Clock className="size-3" strokeWidth={1.5} />
            Recent
          </button>
          <button
            onClick={() => onSortChange('trending')}
            className={cn(
              'flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider px-4 py-3 border-b-2 -mb-px transition-colors duration-150',
              sortType === 'trending'
                ? 'border-amber text-amber font-medium'
                : 'border-transparent text-text-muted hover:text-foreground',
            )}
          >
            <TrendingUp className="size-3" strokeWidth={1.5} />
            Trending
          </button>
        </div>
      )}

      {sortType !== 'trending' && (
        <div className="flex flex-col lg:flex-row lg:items-center lg:px-6 lg:py-3 lg:gap-6">
          <div className="flex items-center gap-1 px-4 pt-3 pb-0 lg:p-0 overflow-x-auto lg:flex-1 lg:min-w-0">
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

          <div className="grid grid-cols-2 gap-2 px-4 py-3 lg:p-0 lg:ml-auto lg:flex lg:items-center lg:gap-2 lg:min-w-0">
            <div className="min-w-0">
              <Select value={selectedDeptId || ALL} onValueChange={handleDeptChange}>
                <SelectTrigger
                  size="sm"
                  className="font-mono text-xs text-text-muted w-full min-w-0 lg:w-40"
                  title={selectedDeptLabel}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value={ALL}>All departments</SelectItem>
                  {(departments ?? []).map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-0">
              <Select
                value={selectedYear === null ? ALL : String(selectedYear)}
                onValueChange={handleYearChange}
              >
                <SelectTrigger
                  size="sm"
                  className="font-mono text-xs text-text-muted w-full lg:w-24"
                  title={selectedYearLabel}
                >
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value={ALL}>All years</SelectItem>
                  {Array.from({ length: 6 }, (_, i) => i + 1).map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      Year {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-0">
              <Select
                value={selectedModuleNumber === null ? ALL : String(selectedModuleNumber)}
                onValueChange={handleModuleChange}
              >
                <SelectTrigger
                  size="sm"
                  className="font-mono text-xs text-text-muted w-full lg:w-28"
                >
                  <SelectValue placeholder="Module" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value={ALL}>All modules</SelectItem>
                  {[1, 2, 3].map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      Module {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 min-w-0">
              <Select value={selectedCourseId || ALL} onValueChange={handleCourseChange}>
                <SelectTrigger
                  size="sm"
                  className="font-mono text-xs text-text-muted w-full min-w-0 lg:w-64 xl:w-80"
                  title={selectedCourseLabel}
                >
                  <SelectValue placeholder="Course" />
                </SelectTrigger>
                <SelectContent position="popper">
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
        </div>
      )}
    </div>
  )
}
