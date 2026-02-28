'use client'

import { ChevronDown, ChevronUp, Link2, FileText, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { TypeBadge } from '@/components/post-card'
import type { ApiPost } from '@/lib/api-types'
import type { PostStatus } from './moderation-header'

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function StatusIcon({ status }: { status: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    APPROVED: <CheckCircle2 className="size-4 text-success" strokeWidth={1.5} />,
    PENDING: <Clock className="size-4 text-amber" strokeWidth={1.5} />,
    REJECTED: <XCircle className="size-4 text-destructive" strokeWidth={1.5} />,
  }
  return <div className="absolute left-4 top-5">{iconMap[status] ?? null}</div>
}

export function ModerationRow({
  post,
  status,
  expanded,
  onToggle,
  onApprove,
  onReject,
}: {
  post: ApiPost
  status: PostStatus
  expanded: boolean
  onToggle: () => void
  onApprove: () => void
  onReject: () => void
}) {
  const currentYear = new Date().getFullYear()
  const yearLevel = post.author.enrollmentYear ? currentYear - post.author.enrollmentYear + 1 : null

  return (
    <div className="border-b border-border">
      <div
        onClick={onToggle}
        className={cn(
          'relative flex items-center gap-4 pl-12 pr-6 py-4 cursor-pointer hover:bg-muted transition-colors duration-150 group',
          expanded && 'bg-muted',
        )}
      >
        <StatusIcon status={status} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <TypeBadge type={post.type} />
          </div>
          <p className="text-sm font-medium text-foreground truncate mt-1">{post.title}</p>
        </div>

        <div className="hidden sm:block shrink-0 w-20">
          <p className="font-mono text-xs text-text-muted">{post.course.code}</p>
        </div>

        <div className="hidden md:block shrink-0 w-32">
          <p className="font-mono text-xs text-foreground">{post.author.name}</p>
          {yearLevel != null && (
            <p className="font-mono text-[11px] text-text-muted">Year {yearLevel}</p>
          )}
        </div>

        <div className="hidden sm:block shrink-0 w-16">
          <p className="font-mono text-xs text-text-muted">
            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
          </p>
        </div>

        {status === 'PENDING' && (
          <div className="hidden group-hover:flex items-center gap-2 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onApprove()
              }}
              className="text-xs font-medium text-success hover:bg-success/10 px-3 py-1.5 rounded-[6px] transition-colors duration-150"
            >
              Approve
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onReject()
              }}
              className="text-xs font-medium text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded-[6px] transition-colors duration-150"
            >
              Reject
            </button>
          </div>
        )}

        <div className="shrink-0 sm:hidden">
          {expanded ? (
            <ChevronUp className="size-4 text-text-muted" />
          ) : (
            <ChevronDown className="size-4 text-text-muted" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="bg-muted px-6 py-5 border-t border-border">
          <div className="max-w-[640px]">
            {post.description && (
              <p className="text-sm text-foreground leading-relaxed mb-4">{post.description}</p>
            )}

            {post.externalUrl && (
              <a
                href={post.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-amber hover:text-amber-hover font-medium mb-4"
              >
                <Link2 className="size-3.5" strokeWidth={1.5} />
                External Link
              </a>
            )}

            {post.files.length > 0 && (
              <div className="flex flex-col gap-2 mb-5">
                {post.files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 bg-card border border-border rounded-[6px] px-4 py-3"
                  >
                    <FileText className="size-4 text-destructive" strokeWidth={1.5} />
                    <span className="text-sm text-foreground truncate flex-1">{file.name}</span>
                    <span className="font-mono text-xs text-text-muted">
                      {formatBytes(file.size)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {status === 'PENDING' && (
              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <button
                  onClick={onApprove}
                  className="h-9 px-5 bg-success text-primary-foreground text-sm font-medium rounded-[6px] hover:bg-success/90 transition-colors duration-150"
                >
                  Approve
                </button>
                <button
                  onClick={onReject}
                  className="h-9 px-5 bg-destructive text-primary-foreground text-sm font-medium rounded-[6px] hover:bg-destructive/90 transition-colors duration-150"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
