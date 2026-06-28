'use client'

import type { CSSProperties } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, FileText, Flame, MessageSquare } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn, calcYearLevel, pluralize } from '@/lib/utils'
import { useAcademicYear } from '@/hooks/use-academic-year'
import { UserAvatar } from '@/components/shared/user-avatar'
import { useUIStore } from '@/lib/store'
import { useAuth } from '@/contexts/auth-context'
import { ReportDialog } from '@/components/ReportDialog'
import { CollectionPicker } from '@/components/posts/collection-picker'
import { getTypeMeta, sumReactions } from '@/components/feed/feed-card-meta'
import type { ApiPost } from '@/lib/api-types'

interface ArcadePostCardProps {
  post: ApiPost
  index?: number
  trending?: boolean
}

export function ArcadePostCard({ post, index = 0, trending = false }: ArcadePostCardProps) {
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

  const meta = getTypeMeta(post.type)
  const TypeIcon = meta.icon
  const ReactionIcon = meta.reactionIcon
  const reactionTotal = sumReactions(post.reactionCounts as Record<string, unknown>)

  return (
    <article
      className="arcade-card relative grid grid-cols-[56px_1fr] sm:grid-cols-[80px_1fr] bg-card rounded-2xl overflow-hidden"
      style={{ '--stagger': index } as CSSProperties}
    >
      {/* Stretched link: covers the card for navigation; interactive children
          sit above it via z-index so they never trigger it */}
      <Link
        href={`/posts/${post.id}`}
        aria-label={post.title ?? 'View post'}
        className="absolute inset-0"
        onClick={() => markRead(post.id)}
      />
      {/* Type spine */}
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-2 border-r-[3px] border-border-strong py-4',
          meta.softBg,
          meta.text,
        )}
      >
        <TypeIcon className="size-5" strokeWidth={2.25} />
        <span className="[writing-mode:vertical-rl] rotate-180 font-mono text-[10px] font-bold uppercase tracking-[0.14em]">
          {meta.label}
        </span>
      </div>

      {/* Body */}
      <div className="min-w-0 p-4 pr-12 sm:p-5 sm:pr-14">
        <div className="flex items-center gap-2.5 mb-2 flex-wrap">
          {post.course && (
            <span className="font-mono text-xs font-bold bg-foreground text-background px-2.5 py-0.5 rounded-md">
              {post.course.code}
            </span>
          )}
          <span className="font-mono text-xs text-text-muted">
            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
          </span>
          {trending && (
            <span className="arcade-trending ml-auto inline-flex items-center gap-1 rounded-full border-2 border-border-strong bg-destructive text-destructive-foreground px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider">
              <Flame className="size-3" strokeWidth={2.5} />
              trending
            </span>
          )}
        </div>

        <h3
          className={cn(
            'text-lg sm:text-xl font-bold leading-tight tracking-tight mb-2.5 line-clamp-2',
            isRead ? 'text-text-muted' : 'text-foreground',
          )}
        >
          {post.title}
        </h3>

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {post.tags.map((tag) => (
              <button
                key={tag.id}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  router.push(`/feed?tag=${encodeURIComponent(tag.name)}`)
                }}
                className="relative z-[1] font-mono text-[10px] font-bold px-2 py-0.5 rounded-lg bg-background text-text-muted border-2 border-border hover:border-amber hover:text-amber transition-colors"
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1.5 flex-wrap mb-3">
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
              className="relative z-[1] flex items-center gap-1 hover:underline cursor-pointer"
            >
              <UserAvatar name={author.name} image={author.image} size="xs" className="shrink-0" />
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
          {post.files != null && post.files.length > 0 && (
            <>
              <span className="text-text-muted text-xs">{'·'}</span>
              <span className="flex items-center gap-1">
                <FileText className="size-3.5 text-text-muted" strokeWidth={1.5} />
                <span className="font-mono text-xs text-text-muted">
                  {post.files.length} {pluralize(post.files.length, 'file')}
                </span>
              </span>
            </>
          )}
        </div>

        {/* Stat chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              'arcade-stat inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-1 font-mono text-xs font-bold text-foreground',
              meta.softBg,
            )}
          >
            <ReactionIcon className={cn('size-3.5', meta.text)} strokeWidth={2.25} />
            {reactionTotal}
          </span>
          <span className="arcade-stat inline-flex items-center gap-1.5 rounded-[10px] bg-card px-2.5 py-1 font-mono text-xs font-bold text-foreground">
            <MessageSquare className="size-3.5 text-text-muted" strokeWidth={2.25} />
            {post._count.comments}
          </span>
          <span className="arcade-stat inline-flex items-center gap-1.5 rounded-[10px] bg-card px-2.5 py-1 font-mono text-xs font-bold text-foreground">
            <Eye className="size-3.5 text-text-muted" strokeWidth={2.25} />
            {post.views}
          </span>
        </div>
      </div>

      {/* Action buttons live inside the card so they pop and lift with it */}
      <div className="absolute top-3 right-3 z-[1] flex flex-col items-center gap-1">
        {isAuthenticated && !post.isOwner && <ReportDialog postId={post.id} />}
        <CollectionPicker post={post} />
      </div>
    </article>
  )
}
