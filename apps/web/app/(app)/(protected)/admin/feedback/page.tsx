'use client'

import { useState } from 'react'
import { MessageSquareHeart, Bug, Inbox } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { cn } from '@/lib/utils'
import { useAdminFeedbackControllerFindAll } from '@/src/lib/api/generated/admin/admin'
import {
  AdminFeedbackControllerFindAllType,
  type FeedbackEntity,
} from '@/src/lib/api/generated/unishareAPI.schemas'

type FilterValue = 'ALL' | AdminFeedbackControllerFindAllType

const FILTERS: { label: string; value: FilterValue }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Feedback', value: AdminFeedbackControllerFindAllType.FEEDBACK },
  { label: 'Bug Reports', value: AdminFeedbackControllerFindAllType.BUG_REPORT },
]

export default function AdminFeedbackPage() {
  const [activeFilter, setActiveFilter] = useState<FilterValue>('ALL')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const params =
    activeFilter === 'ALL'
      ? { limit: 100 }
      : { limit: 100, type: activeFilter as AdminFeedbackControllerFindAllType }

  const { data, isLoading } = useAdminFeedbackControllerFindAll(params, {
    query: { select: (r) => r.data },
  })

  const items: FeedbackEntity[] = data?.items ?? []

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Feedback" />

      <div className="border-b border-border bg-background px-6 py-3 flex items-center gap-2">
        {FILTERS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => {
              setActiveFilter(value)
              setExpandedId(null)
            }}
            className={cn(
              'px-3 py-1.5 rounded-[6px] text-sm font-medium transition-colors duration-150',
              activeFilter === value
                ? 'bg-amber text-primary-foreground'
                : 'text-text-muted hover:text-foreground hover:bg-muted',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 bg-card">
        {isLoading && (
          <div className="flex items-center justify-center py-16 text-text-muted text-sm">
            Loading…
          </div>
        )}

        {!isLoading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-text-muted">
            <Inbox className="size-8" strokeWidth={1.5} />
            <p className="text-sm">No feedback yet.</p>
          </div>
        )}

        {!isLoading &&
          items.map((item) => {
            const isExpanded = expandedId === item.id
            const isBug = item.type === AdminFeedbackControllerFindAllType.BUG_REPORT
            return (
              <div
                key={item.id}
                className="border-b border-border px-6 py-4 hover:bg-background/50 transition-colors cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'mt-0.5 flex items-center justify-center w-7 h-7 rounded-[6px] shrink-0',
                      isBug ? 'bg-destructive/10' : 'bg-amber/10',
                    )}
                  >
                    {isBug ? (
                      <Bug className="size-3.5 text-destructive" strokeWidth={1.5} />
                    ) : (
                      <MessageSquareHeart className="size-3.5 text-amber" strokeWidth={1.5} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={cn(
                          'font-mono text-[10px] uppercase tracking-wider',
                          isBug ? 'text-destructive' : 'text-amber',
                        )}
                      >
                        {isBug ? 'Bug Report' : 'Feedback'}
                      </span>
                      <span className="text-xs text-text-muted">·</span>
                      <span className="text-xs text-text-muted">
                        {item.user ? item.user.name : 'Anonymous'}
                      </span>
                      <span className="text-xs text-text-muted">·</span>
                      <span className="text-xs text-text-muted">
                        {new Date(item.createdAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <p
                      className={cn(
                        'text-sm text-foreground mt-1 whitespace-pre-wrap',
                        !isExpanded && 'line-clamp-2',
                      )}
                    >
                      {item.message}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}
