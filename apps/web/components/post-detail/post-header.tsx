'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MessageSquare, Share, Pencil, Trash2, Check, Sparkles } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

import { calcYearLevel, pluralize } from '@/lib/utils'
import { ACTION_PILL } from '@/lib/constants'
import { useAcademicYear } from '@/hooks/use-academic-year'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { UserAvatar } from '@/components/shared/user-avatar'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { useAuth } from '@/contexts/auth-context'
import { PostReactions } from '@/components/post-detail/post-reactions'
import { ReportDialog } from '@/components/ReportDialog'
import { CollectionPicker } from '@/components/posts/collection-picker'
import type { ApiPostDetail } from '@/lib/api-types'
import { useQueryClient } from '@tanstack/react-query'
import {
  usePostsControllerSummarize,
  getPostsControllerFindOneQueryKey,
} from '@/src/lib/api/generated/posts/posts'

const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

// The demo's `.tag` pill: sentence case, tinted by one colour.
const TYPE_TAGS: Record<string, { label: string; color: string }> = {
  NOTE: { label: 'Note', color: 'var(--brand-edge)' },
  OLD_QUESTION: { label: 'Past exam', color: 'var(--sky)' },
  EXERCISE: { label: 'Exercise', color: 'var(--ok)' },
}

interface PostHeaderProps {
  post: ApiPostDetail
  isOwner: boolean
  onDelete?: () => void
  isDeleting?: boolean
}

function ActionHint({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent side="top" className="w-auto px-3 py-2">
        <p className="font-mono text-[11px] uppercase tracking-wider text-foreground">{label}</p>
      </HoverCardContent>
    </HoverCard>
  )
}

export function PostHeader({ post, isOwner, onDelete, isDeleting = false }: PostHeaderProps) {
  const [copied, setCopied] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const queryClient = useQueryClient()
  const { mutate: triggerSummarize, isPending: isSummarizing } = usePostsControllerSummarize({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getPostsControllerFindOneQueryKey(post.id) })
      },
    },
  })

  const hasSupportedFile = post.files?.some((f) => SUPPORTED_MIME_TYPES.includes(f.mimeType))
  const canGenerate = isOwner && hasSupportedFile && !post.summary

  function handleShare() {
    navigator.clipboard.writeText(`${window.location.origin}/s/${post.shortCode}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const author = post.author
  const { user, isAuthenticated } = useAuth()

  const academicYear = useAcademicYear()
  const yearLevel =
    author?.enrollmentYear != null && academicYear != null
      ? calcYearLevel(author.enrollmentYear, academicYear)
      : null

  const views = post.views || 0
  const saves = post._count.savedBy
  const stats = (
    <>
      {` · ${views.toLocaleString()} ${pluralize(views, 'view')}`}
      {saves > 0 && ` · ${saves.toLocaleString()} ${pluralize(saves, 'save')}`}
    </>
  )

  return (
    <>
      {isOwner && onDelete && (
        <ConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          title="Delete this post?"
          description="This will remove the post and all attached files. This action cannot be undone."
          confirmLabel="Delete post"
          cancelLabel="Keep post"
          onConfirm={onDelete}
          isPending={isDeleting}
        />
      )}

      {post.status === 'PENDING' && (
        <div className="mb-4 bg-amber-subtle border border-amber/50 px-4 py-3 rounded-[6px]">
          <p className="text-sm text-amber font-medium">
            This post is pending review and is only visible to you.
          </p>
        </div>
      )}

      {post.contentWarning && (
        <div className="mb-4 bg-destructive/8 border border-destructive/30 px-4 py-3 rounded-[6px]">
          <p className="text-sm font-medium text-destructive mb-0.5">Content warning</p>
          <p className="text-sm text-destructive/80">{post.contentWarning}</p>
        </div>
      )}

      <header className="grid gap-3.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <span
            style={{ '--c': (TYPE_TAGS[post.type] ?? TYPE_TAGS.NOTE).color } as React.CSSProperties}
            className="rounded-full bg-[color-mix(in_srgb,var(--c)_14%,transparent)] px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-[var(--c)]"
          >
            {(TYPE_TAGS[post.type] ?? { label: post.type }).label}
          </span>
          <span className="font-mono text-[13px] text-muted-foreground">
            {[
              post.course.code,
              post.moduleNumber != null && `Module ${post.moduleNumber}`,
              post.year != null && `Year ${post.year}`,
              post.semester != null && `Semester ${post.semester}`,
              post.examYear != null && `${post.examYear} Exam`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
          {post.tags
            ?.filter((tag) => tag.name)
            .map((tag) => (
              <Link
                key={tag.id}
                href={`/feed?tag=${encodeURIComponent(tag.name)}`}
                className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-muted-foreground hover:text-ink"
              >
                {tag.name}
              </Link>
            ))}
        </div>
        <h1 className="max-w-[24ch] font-body text-[clamp(26px,3.6vw,34px)] font-semibold leading-[1.12] tracking-[-0.022em] text-balance text-ink">
          {post.title}
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          {author ? (
            <Link href={`/users/${author.id}`} className="group">
              <Byline name={author.name} image={author.image ?? null}>
                {yearLevel != null && `Year ${yearLevel} student · `}
                {author.department?.name && `${author.department.name} · `}
                <PostTimestamp createdAt={post.createdAt} editedAt={post.editedAt} />
                {stats}
              </Byline>
            </Link>
          ) : isOwner && user ? (
            <Byline name={user.name} image={user.image ?? null} suffix="(you · anonymous)">
              <PostTimestamp createdAt={post.createdAt} editedAt={post.editedAt} />
              {stats}
            </Byline>
          ) : (
            <Byline name="Anonymous" image={null}>
              <PostTimestamp createdAt={post.createdAt} editedAt={post.editedAt} />
              {stats}
            </Byline>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1 border-y border-line py-1.5">
          <PostReactions post={post} />
          <a href="#comments" className={ACTION_PILL}>
            <MessageSquare className="size-5" strokeWidth={2} />
            {post._count.comments.toLocaleString()} {pluralize(post._count.comments, 'comment')}
          </a>
          <CollectionPicker post={post} align="end" pill />
          {isAuthenticated && !isOwner && <ReportDialog postId={post.id} pill />}

          <div className="ml-auto flex items-center gap-1">
            <button type="button" onClick={handleShare} className={ACTION_PILL}>
              {copied ? (
                <Check className="size-5 text-success" strokeWidth={2} />
              ) : (
                <Share className="size-5" strokeWidth={2} />
              )}
              <span className="max-sm:sr-only">{copied ? 'Copied' : 'Share'}</span>
            </button>
            {isOwner && (
              <>
                {canGenerate && (
                  <ActionHint label="Generate Summary">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => triggerSummarize({ id: post.id })}
                      disabled={isSummarizing}
                      aria-label="Generate summary"
                    >
                      <Sparkles
                        className={`size-4 text-muted-foreground ${isSummarizing ? 'animate-pulse' : ''}`}
                        strokeWidth={2}
                      />
                    </Button>
                  </ActionHint>
                )}
                <ActionHint label="Edit Post">
                  <Button variant="ghost" size="icon-sm" aria-label="Edit" asChild>
                    <Link href={`/posts/${post.id}/edit`}>
                      <Pencil className="size-4 text-muted-foreground" strokeWidth={2} />
                    </Link>
                  </Button>
                </ActionHint>
                <ActionHint label="Delete Post">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={isDeleting}
                    aria-label="Delete"
                  >
                    <Trash2 className="size-4 text-muted-foreground" strokeWidth={2} />
                  </Button>
                </ActionHint>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  )
}

function Byline({
  name,
  image,
  suffix,
  children,
}: {
  name: string
  image: string | null
  suffix?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3">
      <UserAvatar name={name} image={image} size="md" className="size-[34px] rounded-full" />
      <div className="grid leading-[1.35]">
        <b className="text-[15px] font-semibold group-hover:underline">
          {name} {suffix && <span className="font-normal text-muted-foreground">{suffix}</span>}
        </b>
        <small className="text-[13px] text-muted-foreground">{children}</small>
      </div>
    </div>
  )
}

function PostTimestamp({ createdAt, editedAt }: { createdAt: string; editedAt?: string | null }) {
  const created = new Date(createdAt)
  const edited = editedAt ? new Date(editedAt) : null
  return (
    <>
      <time dateTime={created.toISOString()} title={format(created, 'PPpp')}>
        {formatDistanceToNow(created, { addSuffix: true })}
      </time>
      {edited && (
        <>
          {' · '}
          <time dateTime={edited.toISOString()} title={format(edited, 'PPpp')}>
            edited {formatDistanceToNow(edited, { addSuffix: true })}
          </time>
        </>
      )}
    </>
  )
}
