'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ChevronDown, MessageSquareReply, Pencil, Trash2 } from 'lucide-react'
import { CommentEditor } from '@/components/post-detail/comment-editor'
import { UserAvatar } from '@/components/shared/user-avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { CommentEntity, UserProfileEntity } from '@/src/lib/api/generated/unishareAPI.schemas'
import { cn } from '@/lib/utils'
import { renderWithLinks } from '@/lib/render-with-links'

const DELETED_COMMENT_CONTENT = 'This comment was deleted.'

interface CommentThreadViewer {
  user: UserProfileEntity | null
  postAuthorId?: string | null
  isAuthenticated: boolean
}

interface CommentThreadEditState {
  editingCommentId: string | null
  editText: string
}

interface CommentThreadReplyState {
  replyCommentId: string | null
  replyText: string
}

interface CommentThreadPendingState {
  isUpdating: boolean
  isRemoving: boolean
  isReplying: boolean
}

interface CommentThreadEditActions {
  start: (commentId: string, content: string) => void
  cancel: () => void
  change: (value: string) => void
  submit: (commentId: string) => void
}

interface CommentThreadReplyActions {
  start: (commentId: string) => void
  cancel: () => void
  change: (value: string) => void
  submit: (commentId: string) => void
}

interface CommentThreadItemProps {
  comment: CommentEntity
  depth: number
  viewer: CommentThreadViewer
  editState: CommentThreadEditState
  replyState: CommentThreadReplyState
  pendingState: CommentThreadPendingState
  editActions: CommentThreadEditActions
  replyActions: CommentThreadReplyActions
  onDelete: (commentId: string) => void
}

interface CommentLayerStyle {
  accentClassName: string
  badgeClassName: string
  indentClassName: string
}

function getCommentLayerStyle(depth: number): CommentLayerStyle {
  if (depth === 0) {
    return {
      accentClassName: 'bg-transparent',
      badgeClassName: 'text-text-muted',
      indentClassName: '',
    }
  }

  const palette = [
    {
      accentClassName: 'bg-amber',
      badgeClassName: 'text-amber',
    },
    {
      accentClassName: 'bg-info',
      badgeClassName: 'text-info',
    },
    {
      accentClassName: 'bg-success',
      badgeClassName: 'text-success',
    },
    {
      accentClassName: 'bg-text-secondary',
      badgeClassName: 'text-text-secondary',
    },
  ] as const

  const paletteItem = palette[(depth - 1) % palette.length]
  const indentSteps = Math.min(depth, 8)

  return {
    ...paletteItem,
    indentClassName: cn(
      depth >= 1 && 'ml-4',
      indentSteps >= 2 && 'sm:ml-7',
      indentSteps >= 3 && 'lg:ml-10',
      indentSteps >= 5 && 'xl:ml-12',
    ),
  }
}

export function CommentThreadItem({
  comment,
  depth,
  viewer,
  editState,
  replyState,
  pendingState,
  editActions,
  replyActions,
  onDelete,
}: CommentThreadItemProps) {
  const [areRepliesOpen, setAreRepliesOpen] = useState(true)
  const layerStyle = getCommentLayerStyle(depth)
  const isDeletedComment = comment.content === DELETED_COMMENT_CONTENT
  const isEdited = comment.updatedAt !== comment.createdAt
  const currentUserId = viewer.user?.id ?? null
  const isCommentOwner = comment.userId === currentUserId
  const isViewerPostAuthor = viewer.postAuthorId != null && viewer.postAuthorId === currentUserId
  const isOriginalPosterComment =
    viewer.postAuthorId != null && comment.userId === viewer.postAuthorId
  const isAdmin = viewer.user?.role === 'ADMIN'
  const canModerate = isCommentOwner || isViewerPostAuthor || isAdmin
  const canEdit = isCommentOwner
  const canDelete = canModerate
  const canReply = viewer.isAuthenticated
  const hasReplies = (comment.children?.length ?? 0) > 0
  const isEditing = editState.editingCommentId === comment.id
  const isReplyingToComment = replyState.replyCommentId === comment.id
  const isTopLevelComment = depth === 0

  return (
    <div
      className={cn(
        'group py-4',
        isTopLevelComment && 'border-b border-border/70 last:border-b-0',
        depth > 0 && 'pb-0',
        layerStyle.indentClassName,
      )}
    >
      <div className={cn(depth > 0 && 'pt-1')}>
        <div className={cn('relative', depth > 0 && 'pl-5')}>
          {depth > 0 && (
            <button
              type="button"
              aria-label={areRepliesOpen ? 'Collapse thread' : 'Expand thread'}
              onClick={() => hasReplies && setAreRepliesOpen((c) => !c)}
              className={cn(
                'absolute top-0 bottom-0 left-0 w-4 flex items-start justify-start',
                hasReplies ? 'cursor-pointer group/bar' : 'cursor-default',
              )}
            >
              <span
                className={cn(
                  'w-1.5 h-full rounded-full transition-opacity duration-150',
                  layerStyle.accentClassName,
                  hasReplies && 'group-hover/bar:opacity-50',
                )}
              />
            </button>
          )}
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <Link href={`/users/${comment.userId}`} className="shrink-0">
                  <UserAvatar name={comment.user.name} image={comment.user.image} size="sm" />
                </Link>
                <Link
                  href={`/users/${comment.userId}`}
                  className={cn(
                    'truncate text-sm font-medium hover:underline',
                    depth > 0 ? layerStyle.badgeClassName : 'text-foreground',
                  )}
                >
                  {comment.user.name}
                </Link>
                {isOriginalPosterComment && (
                  <Badge
                    variant="outline"
                    className="h-5 rounded-full border-amber/30 bg-amber-subtle/60 px-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-amber"
                  >
                    OP
                  </Badge>
                )}
                <span className={cn('font-mono text-xs', layerStyle.badgeClassName)}>
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                </span>
                {isEdited && !isDeletedComment && (
                  <span
                    className={cn(
                      'font-mono text-[10px] uppercase tracking-wider',
                      layerStyle.badgeClassName,
                    )}
                  >
                    (edited)
                  </span>
                )}
              </div>
            </div>
          </div>

          {isEditing ? (
            <div className="pl-8.5">
              <CommentEditor
                value={editState.editText}
                onChange={editActions.change}
                onCancel={editActions.cancel}
                onSubmit={() => editActions.submit(comment.id)}
                isPending={pendingState.isUpdating}
                submitLabel="Save"
                pendingLabel="Saving..."
              />
            </div>
          ) : (
            <>
              <p
                className={cn(
                  'pl-8.5 text-sm leading-relaxed',
                  isDeletedComment ? 'italic text-text-muted' : 'text-foreground',
                )}
              >
                {isDeletedComment
                  ? comment.content
                  : renderWithLinks(comment.content, 'text-primary')}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1 pl-8.5">
                {canReply && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => replyActions.start(comment.id)}
                    disabled={pendingState.isReplying}
                    className="font-mono uppercase tracking-wider text-text-muted hover:bg-transparent hover:text-foreground"
                  >
                    <MessageSquareReply className="size-3.5" strokeWidth={1.5} />
                    Reply
                  </Button>
                )}
                {canEdit && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => editActions.start(comment.id, comment.content)}
                    disabled={pendingState.isUpdating || pendingState.isRemoving}
                    aria-label="Edit comment"
                  >
                    <Pencil className="size-3.5 text-text-muted" strokeWidth={1.5} />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onDelete(comment.id)}
                    disabled={pendingState.isUpdating || pendingState.isRemoving}
                    aria-label="Delete comment"
                  >
                    <Trash2 className="size-3.5 text-text-muted" strokeWidth={1.5} />
                  </Button>
                )}
              </div>
            </>
          )}

          {isReplyingToComment && (
            <div className="mt-3 pl-8.5">
              <CommentEditor
                value={replyState.replyText}
                onChange={replyActions.change}
                onCancel={replyActions.cancel}
                onSubmit={() => replyActions.submit(comment.id)}
                isPending={pendingState.isReplying}
                submitLabel="Reply"
                pendingLabel="Replying..."
                placeholder={`Reply to ${comment.user.name}...`}
              />
            </div>
          )}
          {hasReplies && (
            <div className="mt-3 pl-8.5">
              <span className="inline-flex h-8 items-center">
                <ChevronDown
                  className={cn(
                    'mr-1 size-3 transition-transform',
                    !areRepliesOpen && '-rotate-90',
                    layerStyle.badgeClassName,
                  )}
                  strokeWidth={1.5}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => setAreRepliesOpen((current) => !current)}
                  className="gap-1.5 px-0 font-mono uppercase tracking-wider text-text-muted hover:bg-transparent hover:text-foreground"
                >
                  {areRepliesOpen
                    ? 'Hide replies'
                    : `Show replies (${comment.children?.length ?? 0})`}
                </Button>
              </span>
            </div>
          )}
        </div>

        {hasReplies && areRepliesOpen && (
          <div className="mt-2">
            {comment.children?.map((child) => (
              <CommentThreadItem
                key={child.id}
                comment={child}
                depth={depth + 1}
                viewer={viewer}
                editState={editState}
                replyState={replyState}
                pendingState={pendingState}
                editActions={editActions}
                replyActions={replyActions}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
