'use client'

import { cn } from '@/lib/utils'

export const typeFilters = ['ALL', 'NOTES', 'PAST EXAMS'] as const
export type TypeFilter = (typeof typeFilters)[number]

interface FilterStripProps {
  activeFilter: TypeFilter
  onFilterChange: (filter: TypeFilter) => void
}

export function FilterStrip({ activeFilter, onFilterChange }: FilterStripProps) {
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
    </div>
  )
}
