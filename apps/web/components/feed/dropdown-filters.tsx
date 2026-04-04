import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { TrendingUp, Clock } from 'lucide-react'

const ALL = '__all__'

export type SortType = 'recent' | 'trending'

export interface DropdownFiltersProps {
  selectedDeptId: string
  selectedYear: number | null
  selectedCourseId: string
  selectedModuleNumber: number | null
  departments: { id: string; name: string }[] | undefined
  filteredCourses: { id: string; code: string; name: string }[]
  selectedDeptLabel: string
  selectedYearLabel: string
  selectedCourseLabel: string
  onDeptChange: (value: string) => void
  onYearChange: (value: string) => void
  onCourseChange: (value: string) => void
  onModuleChange: (value: string) => void
  sortType?: SortType
  onSortChange?: (sort: SortType) => void
}

export function DropdownFilters({
  // selectedDeptId,
  selectedYear,
  selectedCourseId,
  selectedModuleNumber,
  // departments,
  filteredCourses,
  selectedDeptLabel,
  selectedYearLabel,
  selectedCourseLabel,
  // onDeptChange,
  onYearChange,
  onCourseChange,
  onModuleChange,
  sortType = 'recent',
  onSortChange,
}: DropdownFiltersProps) {
  return (
    <div className="flex flex-col gap-3 pb-2">
      {onSortChange && (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onSortChange('recent')}
            className={cn(
              'flex items-center justify-center gap-1.5 font-mono text-xs uppercase tracking-wider px-3 py-2 rounded-md border transition-colors duration-150',
              sortType === 'recent'
                ? 'border-amber bg-amber/10 text-amber font-medium'
                : 'border-border text-text-muted hover:text-foreground hover:border-foreground/20',
            )}
          >
            <Clock className="size-3" strokeWidth={1.5} />
            Recent
          </button>
          <button
            onClick={() => onSortChange('trending')}
            className={cn(
              'flex items-center justify-center gap-1.5 font-mono text-xs uppercase tracking-wider px-3 py-2 rounded-md border transition-colors duration-150',
              sortType === 'trending'
                ? 'border-amber bg-amber/10 text-amber font-medium'
                : 'border-border text-text-muted hover:text-foreground hover:border-foreground/20',
            )}
          >
            <TrendingUp className="size-3" strokeWidth={1.5} />
            Trending
          </button>
        </div>
      )}
      {sortType !== 'trending' && (
        <div className="grid grid-cols-2 gap-2">
          {/* <div className="col-span-2">
            <Select value={selectedDeptId || ALL} onValueChange={onDeptChange}>
              <SelectTrigger
                size="sm"
                className="font-mono text-xs text-text-muted w-full"
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
          </div> */}

          <Select
            value={selectedYear === null ? ALL : String(selectedYear)}
            onValueChange={onYearChange}
          >
            <SelectTrigger
              size="sm"
              className="font-mono text-xs text-text-muted w-full"
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

          <Select
            value={selectedModuleNumber === null ? ALL : String(selectedModuleNumber)}
            onValueChange={onModuleChange}
          >
            <SelectTrigger size="sm" className="font-mono text-xs text-text-muted w-full">
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

          <div className="col-span-2">
            <Select value={selectedCourseId || ALL} onValueChange={onCourseChange}>
              <SelectTrigger
                size="sm"
                className="font-mono text-xs text-text-muted w-full"
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
      )}
    </div>
  )
}
