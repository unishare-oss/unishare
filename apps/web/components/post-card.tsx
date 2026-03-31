'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileText, MessageSquare } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn, calcYearLevel, pluralize } from '@/lib/utils'
import { useAcademicYear } from '@/hooks/use-academic-year'
import { UserAvatar } from '@/components/shared/user-avatar'
import { useUIStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { ReportDialog } from '@/components/ReportDialog'
import { CollectionPicker } from '@/components/posts/collection-picker'
import type { ApiPost } from '@/lib/api-types'

const typeLabel: Record<string, string> = {
  NOTE: 'NOTE',
  OLD_QUESTION: 'PAST EXAM',
  ASSIGNMENT: 'ASSIGNMENT',
}

export function TypeBadge({ type }: { type: string }) {
  const colorClass =
    type === 'NOTE'
      ? 'border-info text-info'
      : type === 'ASSIGNMENT'
        ? 'border-green-500 text-green-500'
        : 'border-amber text-amber'
  return (
    <span
      className={cn(
        'font-mono text-[11px] uppercase tracking-wider px-2 py-0.5 border rounded-[4px]',
        colorClass,
      )}
    >
      {typeLabel[type] ?? type}
    </span>
  )
}

export function PostCard({ post }: { post: ApiPost }) {
  const router = useRouter()
  const isRead = useUIStore((s) => s.readPostIds.includes(post.id))
  const markRead = useUIStore((s) => s.markRead)
  const { isAuthenticated } = useAuth()

  const author = post.author

  const academicYear = useAcademicYear()
  const yearLevel =
    author?.enrollmentYear != null && academicYear != null
      ? calcYearLevel(author.enrollmentYear, academicYear)
      : null

  return (
    <div className="relative border-b border-border hover:bg-muted transition-colors duration-150">
      <Link href={`/posts/${post.id}`} className="block" onClick={() => markRead(post.id)}>
        <article className="flex items-start justify-between px-6 py-5 cursor-pointer pr-16">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <TypeBadge type={post.type} />
              <span className="font-mono text-[13px] text-amber font-medium">
                {post.course.code}
              </span>
              <span className="text-text-muted text-[13px]">{'·'}</span>
              <span className="text-text-muted text-[13px]">{post.course.department.name}</span>
            </div>
            <h3
              className={cn(
                'text-base font-medium mb-2 line-clamp-1',
                isRead ? 'text-text-muted' : 'text-foreground',
              )}
            >
              {post.title}
            </h3>
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {post.tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      router.push(`/feed?tag=${encodeURIComponent(tag.name)}`)
                    }}
                    className="font-mono text-[10px] px-1.5 py-0.5 rounded-[4px] bg-muted text-text-muted border border-border hover:border-amber hover:text-amber transition-colors"
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1.5 flex-wrap">
              {author ? (
                <span
                  role="link"
                  tabIndex={0}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    router.push(`/users/${author.id}`)
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && router.push(`/users/${author.id}`)}
                  className="flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <UserAvatar
                    name={author.name}
                    image={author.image}
                    size="xs"
                    className="shrink-0"
                  />
                  <span className="font-mono text-xs text-foreground">{author.name}</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 cursor-default">
                  <UserAvatar name="Anonymous" image={null} size="xs" className="shrink-0" />
                  <span className="font-mono text-xs text-foreground">Anonymous</span>
                </span>
              )}
              {yearLevel != null && (
                <>
                  <span className="text-text-muted text-xs">{'·'}</span>
                  <span className="font-mono text-xs text-text-muted">Year {yearLevel}</span>
                </>
              )}
              <span className="text-text-muted text-xs">{'·'}</span>
              <span className="flex items-center gap-1">
                <FileText className="size-3.5 text-text-muted" strokeWidth={1.5} />
                <span className="font-mono text-xs text-text-muted">
                  {post.files.length} {post.files.length === 1 ? 'file' : 'files'}
                </span>
              </span>
              <span className="text-text-muted text-xs">{'·'}</span>
              <span className="flex items-center gap-1">
                <MessageSquare className="size-3.5 text-text-muted" strokeWidth={1.5} />
                <span className="font-mono text-xs text-text-muted">
                  {post._count.comments} {pluralize(post._count.comments, 'comment')}
                </span>
              </span>
              <span className="text-text-muted text-xs">{'·'}</span>
              <span className="font-mono text-xs text-text-muted">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>
        </article>
      </Link>

      {/* Action buttons sit outside the Link so clicks never trigger navigation */}
      <div className="absolute top-5 right-6 flex flex-col items-center gap-1">
        {isAuthenticated && !post.isOwner && <ReportDialog postId={post.id} />}
        <CollectionPicker post={post} />
      </div>
    </div>
  )
}
