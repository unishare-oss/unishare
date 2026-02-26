'use client'

import { cn } from '@/lib/utils'
import type { PostStatus } from '@/lib/mock-data'

const statusFilters: PostStatus[] = ['PENDING', 'APPROVED', 'REJECTED']

interface ModerationHeaderProps {
  pendingCount: number
  activeFilter: PostStatus
  onFilterChange: (filter: PostStatus) => void
}

export function ModerationHeader({
  pendingCount,
  activeFilter,
  onFilterChange,
}: ModerationHeaderProps) {
  return (
    <header className="sticky top-0 z-20 bg-card border-b border-border px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 className="text-[22px] font-semibold text-foreground">Moderation Queue</h1>
        <p className="font-mono text-[13px] text-text-muted mt-0.5">
          {pendingCount} pending review
        </p>
      </div>
      <div className="flex items-center gap-1">
        {statusFilters.map((filter) => (
          <button
            key={filter}
            onClick={() => onFilterChange(filter)}
            className={cn(
              'font-mono text-xs uppercase tracking-wider px-3 py-1.5 rounded-[6px] transition-colors duration-150 flex items-center gap-2',
              activeFilter === filter
                ? 'bg-amber-subtle text-amber font-medium'
                : 'text-text-muted hover:text-foreground hover:bg-muted',
            )}
          >
            {filter}
            {filter === 'PENDING' && pendingCount > 0 && (
              <span className="bg-amber text-primary-foreground text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-[4px]">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>
    </header>
  )
}
