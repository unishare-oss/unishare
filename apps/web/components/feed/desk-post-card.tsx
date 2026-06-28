'use client'

import type { CSSProperties } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, FileText, MessageSquare } from 'lucide-react'
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

/** Deterministic per-card tilt so the desk looks scattered but stable. */
const ROTATIONS = [-1.6, 1.2, -0.8, 1.8, -1.2, 0.9] as const
const TAPE_TILTS = [-2, 2, -1, 2.5, -1.5, 1] as const

/** Washi tape tint per post type (low-alpha type color, theme-driven). */
const TAPE_TINT: Record<string, string> = {
  NOTE: 'color-mix(in srgb, var(--type-note) 40%, transparent)',
  OLD_QUESTION: 'color-mix(in srgb, var(--type-exam) 40%, transparent)',
  EXERCISE: 'color-mix(in srgb, var(--type-exercise) 35%, transparent)',
}

interface DeskPostCardProps {
  post: ApiPost
  index?: number
  trending?: boolean
}

export function DeskPostCard({ post, index = 0, trending = false }: DeskPostCardProps) {
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

  const tilt = ROTATIONS[index % ROTATIONS.length]
  const tapeTilt = TAPE_TILTS[index % TAPE_TILTS.length]

  return (
    <article
      className={cn(
        'desk-paper relative h-full bg-card border border-border-strong/50 px-5 pt-7 pb-4',
        post.type === 'NOTE' && 'desk-ruled',
        post.type === 'EXERCISE' && 'desk-grid',
        trending && 'outline-solid outline-2 outline-offset-[3px] outline-border-strong',
      )}
      style={{ '--stagger': index, '--tilt': `${tilt}deg` } as CSSProperties}
    >
      {/* Stretched link: covers the card for navigation; interactive children
          sit above it via z-index so they never trigger it */}
      <Link
        href={`/posts/${post.id}`}
        aria-label={post.title ?? 'View post'}
        className="absolute inset-0"
        onClick={() => markRead(post.id)}
      />

      {/* Washi tape */}
      <span
        aria-hidden
        className="desk-tape pointer-events-none"
        style={
          {
            background: TAPE_TINT[post.type] ?? TAPE_TINT.NOTE,
            '--tape-tilt': `${tapeTilt}deg`,
          } as CSSProperties
        }
      />

      {/* Trending pushpin */}
      {trending && (
        <span
          aria-hidden
          className="desk-pin pointer-events-none absolute -top-1.5 right-6 size-3.5 rounded-full"
        />
      )}

      {/* Type pill */}
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-2.5 py-0.5 text-xs font-semibold italic -rotate-2 mb-2.5',
          meta.text,
          meta.border,
        )}
      >
        <TypeIcon className="size-3.5" strokeWidth={2} />
        {meta.label}
      </span>

      <h3
        className={cn(
          'text-lg font-bold leading-tight tracking-tight mb-1.5 line-clamp-2',
          isRead ? 'text-text-muted' : 'text-foreground',
        )}
      >
        {post.title}
      </h3>

      <p className="text-[13px] text-text-muted mb-2.5">
        {post.course && (
          <>
            <span className="font-mono font-bold text-foreground">{post.course.code}</span>
            {post.course.department?.name && (
              <>
                {' '}
                {'·'} {post.course.department.name}
              </>
            )}
            {' · '}
          </>
        )}
        {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
      </p>

      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {post.tags.map((tag) => (
            <button
              key={tag.id}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                router.push(`/feed?tag=${encodeURIComponent(tag.name)}`)
              }}
              className="relative z-[1] font-mono text-[10px] px-2 py-0.5 rounded-[4px] bg-muted/70 text-text-muted border border-border hover:border-amber hover:text-amber transition-colors"
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

      {/* Dashed divider + stat row */}
      <div className="flex items-center gap-4 border-t-[1.5px] border-dashed border-border-strong/30 pt-2.5">
        <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-foreground">
          <ReactionIcon className={cn('size-3.5', meta.text)} strokeWidth={2.25} />
          {reactionTotal}
        </span>
        <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-foreground">
          <MessageSquare className="size-3.5 text-text-muted" strokeWidth={2.25} />
          {post._count.comments}
        </span>
        <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-foreground">
          <Eye className="size-3.5 text-text-muted" strokeWidth={2.25} />
          {post.views}
        </span>
        {(post.examYear != null || post.moduleNumber != null) && (
          <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-text-muted italic rotate-1">
            {post.examYear != null ? `year ${post.examYear}` : `module ${post.moduleNumber}`}
          </span>
        )}
      </div>

      {/* Folded corner */}
      <span
        aria-hidden
        className="pointer-events-none absolute right-0 bottom-0 size-8 bg-[linear-gradient(135deg,transparent_49%,color-mix(in_srgb,var(--foreground)_12%,transparent)_50%)]"
      />

      {/* Action buttons live inside the paper so they tilt, drop, and lift with it */}
      <div className="absolute top-2.5 right-2.5 z-[1] flex flex-col items-center gap-1">
        {isAuthenticated && !post.isOwner && <ReportDialog postId={post.id} />}
        <CollectionPicker post={post} />
      </div>
    </article>
  )
}
