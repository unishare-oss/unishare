'use client'

import { ChevronDown, ChevronUp, CheckCircle2, Clock, XCircle, Flag } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { TypeBadge } from '@/components/post-card'
import type { ReportDetail, ReportDetailStatus } from '@/src/lib/api/generated/unishareAPI.schemas'

export type { ReportDetail }

const REASON_LABELS: Record<string, string> = {
  SPAM: 'Spam',
  OFFENSIVE: 'Offensive',
  COPYRIGHT: 'Copyright',
  OTHER: 'Other',
}

function StatusIcon({ status }: { status: ReportDetailStatus }) {
  if (status === 'APPROVED')
    return <CheckCircle2 className="size-4 text-success" strokeWidth={1.5} />
  if (status === 'REJECTED')
    return <XCircle className="size-4 text-destructive" strokeWidth={1.5} />
  return <Clock className="size-4 text-amber" strokeWidth={1.5} />
}

interface ReportRowProps {
  report: ReportDetail
  expanded: boolean
  onToggle: () => void
  onApprove: () => void
  onReject: () => void
  isActioning: boolean
}

export function ReportRow({
  report,
  expanded,
  onToggle,
  onApprove,
  onReject,
  isActioning,
}: ReportRowProps) {
  const isPending = report.status === 'PENDING'

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
          <StatusIcon status={report.status} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            {report.post?.type && <TypeBadge type={report.post.type} />}
            <span className="font-mono text-[13px] text-amber font-medium">
              {report.post?.course.code}
            </span>
            <span className="text-text-muted text-[13px]">·</span>
            <span className="text-text-muted text-[13px]">
              {report.post?.course.department.name}
            </span>
          </div>
          <p className="text-sm font-medium text-foreground line-clamp-1 mb-1">
            {report.post?.title ?? '(Untitled)'}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 font-mono text-[11px] px-1.5 py-0.5 rounded-[4px] bg-muted border border-border text-text-muted">
              <Flag className="size-2.5" strokeWidth={1.5} />
              {REASON_LABELS[report.reason] ?? report.reason}
            </span>
            {report.reporter && (
              <span className="font-mono text-xs text-text-muted">by {report.reporter.name}</span>
            )}
            <span className="text-text-muted text-xs">·</span>
            <span className="font-mono text-xs text-text-muted">
              {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
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
          {report.comment && (
            <div className="pt-4">
              <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted mb-1">
                Reporter&apos;s note
              </p>
              <p className="text-sm text-foreground bg-card border border-border rounded-[6px] px-3 py-2">
                {report.comment}
              </p>
            </div>
          )}

          <div className={report.comment ? '' : 'pt-4'}>
            <a
              href={`/posts/${report.post?.id}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="font-mono text-xs text-amber hover:underline"
            >
              View post →
            </a>
          </div>

          {report.adminAction && (
            <div className="text-xs font-mono text-text-muted space-y-0.5">
              <p>
                Action:{' '}
                <span className="text-foreground font-medium">{report.adminAction.action}</span>
                {' · '}
                {formatDistanceToNow(new Date(report.adminAction.createdAt), { addSuffix: true })}
              </p>
              {report.adminAction.reason && <p>Note: {report.adminAction.reason}</p>}
            </div>
          )}

          {isPending && (
            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  onApprove()
                }}
                disabled={isActioning}
              >
                Remove post
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation()
                  onReject()
                }}
                disabled={isActioning}
              >
                Dismiss report
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
