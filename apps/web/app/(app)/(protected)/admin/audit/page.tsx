'use client'

import { useState } from 'react'
import { keepPreviousData } from '@tanstack/react-query'
import { ScrollText, X } from 'lucide-react'
import { useAuditControllerList } from '@/src/lib/api/generated/admin/admin'
import type { AuditControllerListCategory } from '@/src/lib/api/generated/unishareAPI.schemas'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { AuditRow } from '@/components/admin/audit/audit-row'
import {
  AUDIT_CATEGORY_FILTERS,
  type AuditCategoryFilter,
} from '@/components/admin/audit/audit-actions'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 50

export default function AuditLogPage() {
  const [category, setCategory] = useState<AuditCategoryFilter>('ALL')
  const [actor, setActor] = useState<{ id: string; name: string } | null>(null)
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data, isLoading } = useAuditControllerList(
    {
      ...(category !== 'ALL' && { category: category as AuditControllerListCategory }),
      ...(actor && { actorId: actor.id }),
      page,
      limit: PAGE_SIZE,
    },
    { query: { select: (r) => r.data, placeholderData: keepPreviousData } },
  )

  const logs = data?.logs ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function changeFilters(next: () => void) {
    next()
    setPage(1)
    setExpandedId(null)
  }

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="Audit Log"
        large
        subtitle={
          data
            ? `${total.toLocaleString()} ${total === 1 ? 'entry' : 'entries'} · kept 180 days`
            : undefined
        }
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-6 py-4 border-b border-border bg-background">
        <div className="flex items-center gap-1 flex-wrap">
          {AUDIT_CATEGORY_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => changeFilters(() => setCategory(f.value))}
              className={cn(
                'px-3 py-1.5 font-mono text-xs uppercase tracking-wider rounded-[6px] transition-colors',
                category === f.value
                  ? 'bg-amber/10 text-amber'
                  : 'text-text-muted hover:text-foreground hover:bg-muted',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {actor && (
          <button
            onClick={() => changeFilters(() => setActor(null))}
            className="sm:ml-auto inline-flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-xs rounded-[6px] bg-muted text-foreground hover:bg-muted/70 transition-colors"
            aria-label={`Clear actor filter ${actor.name}`}
          >
            Actor: {actor.name}
            <X className="size-3" strokeWidth={1.5} />
          </button>
        )}
      </div>

      <div className="flex-1 bg-card">
        {!isLoading && logs.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            message="No audit entries."
            description="Moderation, account and sign-in activity shows up here."
          />
        ) : (
          logs.map((entry) => (
            <AuditRow
              key={entry.id}
              entry={entry}
              expanded={expandedId === entry.id}
              onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              onFilterActor={(a) => changeFilters(() => setActor(a))}
            />
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="px-6 py-4 flex items-center justify-center gap-2 bg-card border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            className="font-mono text-xs text-text-muted"
          >
            Prev
          </Button>
          <span className="font-mono text-xs text-text-muted px-2">
            {page} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
            className="font-mono text-xs text-text-muted"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
