'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useDepartmentsControllerFindAll } from '@/src/lib/api/generated/departments/departments'
import { useCoursesControllerFindAll } from '@/src/lib/api/generated/courses/courses'
import { type TypeFilter } from '@/lib/store'
import { PostType } from '@/src/lib/api/generated/unishareAPI.schemas'
import { SlidersHorizontal, X } from 'lucide-react'
import {
  DropdownFilters,
  type DropdownFiltersProps,
  type SortType,
} from '@/components/feed/dropdown-filters'
import { DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, Drawer } from '../ui/drawer'
import { Popover, PopoverContent, PopoverTrigger, PopoverClose } from '@/components/ui/popover'

export type { SortType }

export const typeFilters: TypeFilter[] = ['ALL', PostType.NOTE, PostType.EXERCISE]

const typeFilterLabel: Record<TypeFilter, string> = {
  ALL: 'ALL',
  NOTE: 'NOTES',
  OLD_QUESTION: 'PAST EXAMS',
  EXERCISE: 'EXERCISES',
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

  const activeFilterCount = [
    selectedYear !== null,
    !!selectedCourseId,
    selectedModuleNumber !== null,
  ].filter(Boolean).length

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

  const dropdownProps: DropdownFiltersProps = {
    selectedDeptId,
    selectedYear,
    selectedCourseId,
    selectedModuleNumber,
    departments,
    filteredCourses,
    selectedDeptLabel,
    selectedYearLabel,
    selectedCourseLabel,
    onDeptChange: handleDeptChange,
    onYearChange: handleYearChange,
    onCourseChange: handleCourseChange,
    onModuleChange: handleModuleChange,
    sortType,
    onSortChange,
  }

  return (
    <div className="sticky top-17 z-10 border-b border-border bg-card flex flex-col">
      {/* Mobile: type tabs + Filters sheet button in a single row */}
      <div className="md:hidden flex items-center">
        <div className="flex items-center overflow-x-auto flex-1 px-2 scrollbar-none">
          {typeFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => onFilterChange(filter)}
              className={cn(
                'font-mono text-xs uppercase tracking-wider px-3 py-3 border-b-2 shrink-0 transition-colors duration-150',
                activeFilter === filter
                  ? 'border-amber text-amber font-medium'
                  : 'border-transparent text-text-muted hover:text-foreground',
              )}
            >
              {typeFilterLabel[filter]}
            </button>
          ))}
        </div>
        <Drawer>
          <DrawerTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 mr-2 relative font-mono text-xs text-text-muted gap-1.5"
            >
              <SlidersHorizontal className="size-3.5" strokeWidth={1.5} />
              Filters
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 size-4 rounded-full bg-amber text-[10px] text-white font-bold flex items-center justify-center leading-none">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </DrawerTrigger>
          <DrawerContent className="rounded-t-2xl px-5 pb-10 [padding-bottom:max(2.5rem,env(safe-area-inset-bottom))]">
            <DrawerHeader className="mb-5">
              <DrawerTitle className="font-mono text-sm text-left">Filter posts</DrawerTitle>
            </DrawerHeader>
            <DropdownFilters {...dropdownProps} />
          </DrawerContent>
        </Drawer>
      </div>

      {/* Desktop: type tabs + Filters popup button */}
      <div className="hidden md:flex items-center">
        <div className="flex items-center overflow-x-auto flex-1 px-4 scrollbar-none">
          {typeFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => onFilterChange(filter)}
              className={cn(
                'font-mono text-xs uppercase tracking-wider px-3 py-3 border-b-2 shrink-0 transition-colors duration-150',
                activeFilter === filter
                  ? 'border-amber text-amber font-medium'
                  : 'border-transparent text-text-muted hover:text-foreground',
              )}
            >
              {typeFilterLabel[filter]}
            </button>
          ))}
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 mr-4 relative font-mono text-xs text-text-muted gap-1.5"
            >
              <SlidersHorizontal className="size-3.5" strokeWidth={1.5} />
              Filters
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 size-4 rounded-full bg-amber text-[10px] text-white font-bold flex items-center justify-center leading-none">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-5" align="end">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-mono text-sm font-medium">Filter posts</h3>
              <PopoverClose asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-text-muted hover:text-foreground"
                >
                  <X className="size-4" strokeWidth={1.5} />
                </Button>
              </PopoverClose>
            </div>
            <DropdownFilters {...dropdownProps} />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
