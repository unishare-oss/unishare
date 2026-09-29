'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { AuditLogEntity } from '@/src/lib/api/generated/unishareAPI.schemas'
import { TONE_CLASS, actionMeta, describeEntry, targetHref } from './audit-actions'

const ROLE_CLASS: Record<string, string> = {
  ADMIN: 'text-amber',
  MODERATOR: 'text-blue-400',
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

interface AuditRowProps {
  entry: AuditLogEntity
  expanded: boolean
  onToggle: () => void
  onFilterActor: (actor: { id: string; name: string }) => void
}

export function AuditRow({ entry, expanded, onToggle, onFilterActor }: AuditRowProps) {
  const meta = actionMeta(entry.action)
  const Icon = meta.icon
  const summary = describeEntry(entry)
  const href = targetHref(entry)
  const details = Object.entries(entry.metadata ?? {})
  const createdAt = new Date(entry.createdAt)

  return (
    <div className="border-b border-border">
      <div
        onClick={onToggle}
        className={cn(
          'relative flex items-center gap-4 pl-12 pr-6 py-4 cursor-pointer hover:bg-muted transition-colors duration-150',
          expanded && 'bg-muted',
        )}
      >
        <div className="absolute left-4 top-5">
          <Icon className={cn('size-4', TONE_CLASS[meta.tone])} strokeWidth={1.5} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium text-foreground">{meta.label}</span>
            <span className="font-mono text-[11px] px-1.5 py-0.5 rounded-[4px] bg-muted border border-border text-text-muted">
              {entry.action}
            </span>
          </div>
          {summary && <p className="text-sm text-text-muted line-clamp-1 mb-1">{summary}</p>}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs text-text-muted">
              by <span className="text-foreground">{entry.actorName ?? 'system'}</span>
            </span>
            {entry.actorRole && entry.actorRole !== 'STUDENT' && (
              <span
                className={cn(
                  'font-mono text-[11px] uppercase tracking-wider',
                  ROLE_CLASS[entry.actorRole] ?? 'text-text-muted',
                )}
              >
                {entry.actorRole}
              </span>
            )}
            <span className="text-text-muted text-xs">·</span>
            <span className="font-mono text-xs text-text-muted" title={format(createdAt, 'PPpp')}>
              {formatDistanceToNow(createdAt, { addSuffix: true })}
            </span>
          </div>
        </div>

        {expanded ? (
          <ChevronUp className="size-4 text-text-muted shrink-0" strokeWidth={1.5} />
        ) : (
          <ChevronDown className="size-4 text-text-muted shrink-0" strokeWidth={1.5} />
        )}
      </div>

      {expanded && (
        <div className="px-12 pb-5 bg-muted/50 border-t border-border space-y-4">
          <dl className="pt-4 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1.5 text-xs font-mono">
            <dt className="text-text-muted">When</dt>
            <dd className="text-foreground">{format(createdAt, 'PPpp')}</dd>
            {entry.targetType && (
              <>
                <dt className="text-text-muted">Target</dt>
                <dd className="text-foreground break-all">
                  {entry.targetType}
                  {entry.targetId && <span className="text-text-muted"> · {entry.targetId}</span>}
                </dd>
              </>
            )}
            {details.map(([key, value]) => (
              <div key={key} className="contents">
                <dt className="text-text-muted">{key}</dt>
                <dd className="text-foreground break-all">{formatValue(value)}</dd>
              </div>
            ))}
            {entry.ip && (
              <>
                <dt className="text-text-muted">IP</dt>
                <dd className="text-foreground">{entry.ip}</dd>
              </>
            )}
          </dl>

          <div className="flex items-center gap-2">
            {href && (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="font-mono text-xs text-amber hover:underline mr-2"
              >
                View target →
              </a>
            )}
            {entry.actorId && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation()
                  onFilterActor({ id: entry.actorId!, name: entry.actorName ?? 'this user' })
                }}
              >
                Only show {entry.actorName ?? 'this user'}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
