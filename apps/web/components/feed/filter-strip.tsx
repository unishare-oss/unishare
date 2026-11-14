'use client'

import { useEffect } from 'react'
import { useMyDepartments } from '@/hooks/use-my-departments'
import { useCoursesControllerFindAll } from '@/src/lib/api/generated/courses/courses'
import { type TypeFilter } from '@/lib/store'
import { PostType } from '@/src/lib/api/generated/unishareAPI.schemas'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type SortType = 'recent' | 'trending'

const typeFilters: { value: TypeFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: PostType.NOTE, label: 'Notes' },
  { value: PostType.OLD_QUESTION, label: 'Past exams' },
  { value: PostType.EXERCISE, label: 'Exercises' },
]

const ALL = '__all__'
const SELECT = 'h-auto max-w-full min-w-0 sm:max-w-56 text-[13px] font-medium'

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

/** The feed's filters: type chips, then sort, year, module and course selects. */
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
  const { departments, loaded: departmentsLoaded, noUniversity } = useMyDepartments()
  const selectedDept = departments.find((d) => d.id === selectedDeptId)

  // A persisted or profile department outside the user's university falls back to all departments.
  // Only on a loaded list or a missing university: a failed request also gives an empty list.
  const deptOutOfScope = !!selectedDeptId && !selectedDept && (noUniversity || departmentsLoaded)
  useEffect(() => {
    if (!deptOutOfScope) return
    onDeptChange('')
    onCourseChange('')
  }, [deptOutOfScope, onDeptChange, onCourseChange])

  const { data: coursesData } = useCoursesControllerFindAll(
    { limit: 100, ...(selectedDeptId ? { departmentId: selectedDeptId } : {}) },
    { query: { select: (r) => r.data } },
  )
  const courses = (coursesData?.items ?? []).filter((c) => {
    const deptOk = selectedDeptId ? c.department.id === selectedDeptId : true
    const yearOk = selectedYear === null ? true : c.yearLevel === selectedYear
    return deptOk && yearOk
  })

  return (
    <>
      <div role="group" aria-label="Type" className="flex flex-wrap gap-1.5">
        {typeFilters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            aria-pressed={activeFilter === filter.value}
            onClick={() => onFilterChange(filter.value)}
            className="rounded-full border-[1.5px] border-line bg-surface px-3 py-[5px] text-[13.5px] font-medium text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-[0.97] aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-background motion-safe:transition-[background-color,color,border-color,transform] motion-safe:duration-150 [@media(hover:hover)_and_(pointer:fine)]:hover:not-aria-pressed:border-muted-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:not-aria-pressed:text-ink"
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="flex max-w-full flex-wrap gap-2">
        <Select value={sortType} onValueChange={(value) => onSortChange?.(value as SortType)}>
          <SelectTrigger size="sm" aria-label="Sort" className={SELECT}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Recent</SelectItem>
            <SelectItem value="trending">Trending</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={selectedYear === null ? ALL : String(selectedYear)}
          onValueChange={(value) => {
            onYearChange(value === ALL ? null : Number(value))
            onCourseChange('')
          }}
        >
          <SelectTrigger size="sm" aria-label="Year" className={SELECT}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All years</SelectItem>
            {Array.from({ length: 6 }, (_, i) => i + 1).map((year) => (
              <SelectItem key={year} value={String(year)}>
                Year {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedModuleNumber === null ? ALL : String(selectedModuleNumber)}
          onValueChange={(value) => onModuleChange(value === ALL ? null : Number(value))}
        >
          <SelectTrigger size="sm" aria-label="Module" className={SELECT}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All modules</SelectItem>
            {[1, 2, 3].map((module) => (
              <SelectItem key={module} value={String(module)}>
                Module {module}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedCourseId || ALL}
          onValueChange={(value) => onCourseChange(value === ALL ? '' : value)}
        >
          <SelectTrigger size="sm" aria-label="Course" className={SELECT}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All courses</SelectItem>
            {courses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.code} — {course.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  )
}
