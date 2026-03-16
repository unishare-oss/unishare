'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ChevronDown, MessageSquareReply, Pencil, Trash2 } from 'lucide-react'
import { CommentEditor } from '@/components/post-detail/comment-editor'
import { UserAvatar } from '@/components/shared/user-avatar'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { CommentEntity, UserProfileEntity } from '@/src/lib/api/generated/unishareAPI.schemas'
import { cn } from '@/lib/utils'

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
  const isEdited = comment.updatedAt !== comment.createdAt
  const currentUserId = viewer.user?.id ?? null
  const isCommentOwner = comment.userId === currentUserId
  const isPostAuthor = viewer.postAuthorId != null && viewer.postAuthorId === currentUserId
  const isAdmin = viewer.user?.role === 'ADMIN'
  const canModerate = isCommentOwner || isPostAuthor || isAdmin
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
        <>
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 min-w-0">
                {depth > 0 && (
                  <span
                    aria-hidden="true"
                    className={cn('h-6 w-1.5 shrink-0 rounded-full', layerStyle.accentClassName)}
                  />
                )}
                <UserAvatar name={comment.user.name} image={comment.user.image} size="sm" />
                <span className="truncate text-sm font-medium text-foreground">
                  {comment.user.name}
                </span>
                <span className={cn('font-mono text-xs', layerStyle.badgeClassName)}>
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                </span>
                {isEdited && (
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
            <div className="pl-[34px]">
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
              <p className={cn('pl-[34px] text-sm leading-relaxed', 'text-foreground')}>
                {comment.content}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1 pl-[34px]">
                {canReply && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => replyActions.start(comment.id)}
                    disabled={pendingState.isReplying}
                    className={cn(
                      'font-mono uppercase tracking-wider hover:bg-transparent hover:text-foreground',
                      layerStyle.badgeClassName,
                    )}
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
                    <Pencil
                      className={cn(
                        'size-3.5',
                        depth > 0 ? layerStyle.badgeClassName : 'text-text-muted',
                      )}
                      strokeWidth={1.5}
                    />
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
                    <Trash2
                      className={cn(
                        'size-3.5',
                        depth > 0 ? layerStyle.badgeClassName : 'text-text-muted',
                      )}
                      strokeWidth={1.5}
                    />
                  </Button>
                )}
              </div>
            </>
          )}

          {isReplyingToComment && (
            <div className="mt-3 pl-[34px]">
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
        </>

        {hasReplies && (
          <Collapsible open={areRepliesOpen} onOpenChange={setAreRepliesOpen} className="mt-3">
            <div className="pl-[34px]">
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className={cn(
                    'gap-1.5 font-mono uppercase tracking-wider hover:bg-transparent hover:text-foreground',
                    layerStyle.badgeClassName,
                  )}
                >
                  <ChevronDown
                    className={cn('size-3 transition-transform', !areRepliesOpen && '-rotate-90')}
                    strokeWidth={1.5}
                  />
                  {areRepliesOpen
                    ? 'Hide replies'
                    : `Show replies (${comment.children?.length ?? 0})`}
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="mt-2">
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
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  )
}
