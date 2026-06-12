'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Bookmark, Link2, Pencil, Trash2, Check, Eye, MessageSquare, Sparkles } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

import { calcYearLevel, pluralize } from '@/lib/utils'
import { useAcademicYear } from '@/hooks/use-academic-year'
import { TypeBadge } from '@/components/post-card'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { UserAvatar } from '@/components/shared/user-avatar'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { useAuth } from '@/contexts/auth-context'
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
  const { user } = useAuth()

  const academicYear = useAcademicYear()
  const yearLevel =
    author?.enrollmentYear != null && academicYear != null
      ? calcYearLevel(author.enrollmentYear, academicYear)
      : null

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

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <TypeBadge type={post.type} />
          <span className="font-mono text-[13px] text-amber font-medium">{post.course.code}</span>
        </div>
        <h1 className="text-[28px] font-extrabold text-foreground tracking-tight leading-tight mt-2 text-balance">
          {post.title}
        </h1>
        <div className="flex items-center gap-1.5 mt-3 font-mono text-xs text-text-muted flex-wrap">
          {post.year != null && <span>Year {post.year}</span>}
          {post.year != null && post.semester != null && <span>{'·'}</span>}
          {post.semester != null && <span>Semester {post.semester}</span>}
          {post.moduleNumber != null && (
            <>
              <span>{'·'}</span>
              <span>Module {post.moduleNumber}</span>
            </>
          )}
          {post.examYear != null && (
            <>
              <span>{'·'}</span>
              <span>{post.examYear} Exam</span>
            </>
          )}
        </div>
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {post.tags.map((tag) => (
              <Link
                key={tag.id}
                href={`/feed?tag=${encodeURIComponent(tag.name)}`}
                className="font-mono text-[11px] px-2 py-0.5 rounded-lg bg-muted text-text-muted border border-border hover:border-amber hover:text-amber transition-colors"
              >
                {tag.name}
              </Link>
            ))}
          </div>
        )}
        {author ? (
          <Link href={`/users/${author.id}`} className="flex items-center gap-3 mt-4 group w-fit">
            <UserAvatar name={author.name} image={author.image} size="md" />
            <div>
              <p className="text-sm font-medium text-foreground group-hover:underline">
                {author.name}
              </p>
              <p className="font-mono text-xs text-text-muted">
                {yearLevel != null && `Year ${yearLevel} student · `}
                {author.department?.name && `${author.department.name} · `}
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </p>
            </div>
          </Link>
        ) : isOwner && user ? (
          <div className="flex items-center gap-3 mt-4 w-fit">
            <UserAvatar name={user.name} image={user.image ?? null} size="md" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {user.name} <span className="text-text-muted font-normal">(you · anonymous)</span>
              </p>
              <p className="font-mono text-xs text-text-muted">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 mt-4 w-fit">
            <UserAvatar name="Anonymous" image={null} size="md" />
            <div>
              <p className="text-sm font-medium text-foreground">Anonymous</p>
              <p className="font-mono text-xs text-text-muted">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 justify-between mb-6">
        <div className="flex items-center gap-3 font-mono text-xs text-text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Eye className="size-3.5" strokeWidth={1.5} />
            {(post.views || 0).toLocaleString()} {pluralize(post.views || 0, 'view')}
          </span>
          {post._count.savedBy > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Bookmark className="size-3.5" strokeWidth={1.5} />
              {post._count.savedBy.toLocaleString()} {pluralize(post._count.savedBy, 'save')}
            </span>
          )}
          {post._count.comments > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <MessageSquare className="size-3.5" strokeWidth={1.5} />
              {post._count.comments.toLocaleString()} {pluralize(post._count.comments, 'comment')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ActionHint label="Save to Collection">
            <CollectionPicker post={post} align="end" />
          </ActionHint>

          <ActionHint label={copied ? 'Copied' : 'Copy Share Code'}>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleShare}
              aria-label={copied ? 'Copied!' : 'Copy share code'}
            >
              {copied ? (
                <Check className="size-4 text-success" strokeWidth={1.5} />
              ) : (
                <Link2 className="size-4 text-text-muted" strokeWidth={1.5} />
              )}
            </Button>
          </ActionHint>
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
                      className={`size-4 text-text-muted ${isSummarizing ? 'animate-pulse' : ''}`}
                      strokeWidth={1.5}
                    />
                  </Button>
                </ActionHint>
              )}
              <ActionHint label="Edit Post">
                <Button variant="ghost" size="icon-sm" aria-label="Edit" asChild>
                  <Link href={`/posts/${post.id}/edit`}>
                    <Pencil className="size-4 text-text-muted" strokeWidth={1.5} />
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
                  <Trash2 className="size-4 text-text-muted" strokeWidth={1.5} />
                </Button>
              </ActionHint>
            </>
          )}
        </div>
      </div>

      <div className="border-t border-border" />
    </>
  )
}
