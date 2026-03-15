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
  const isDeleted = comment.deletedAt !== null
  const isEdited = comment.updatedAt !== comment.createdAt
  const currentUserId = viewer.user?.id ?? null
  const isCommentOwner = comment.userId === currentUserId
  const isPostAuthor = viewer.postAuthorId != null && viewer.postAuthorId === currentUserId
  const isAdmin = viewer.user?.role === 'ADMIN'
  const canModerate = isCommentOwner || isPostAuthor || isAdmin
  const canEdit = !isDeleted && isCommentOwner
  const canDelete = !isDeleted && canModerate
  const canReply = viewer.isAuthenticated && !isDeleted
  const hasReplies = (comment.children?.length ?? 0) > 0
  const isEditing = editState.editingCommentId === comment.id
  const isReplyingToComment = replyState.replyCommentId === comment.id

  return (
    <div
      className={cn('group py-4 border-b border-border last:border-b-0', depth > 0 && 'pb-0')}
      style={depth > 0 ? { marginLeft: Math.min(depth, 4) * 28 } : undefined}
    >
      <div className={cn(depth > 0 && 'border-l border-border/70 pl-4 sm:pl-5')}>
        {isDeleted ? (
          <p className="pl-[34px] text-sm italic text-text-muted">[deleted]</p>
        ) : (
          <>
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <UserAvatar name={comment.user.name} image={comment.user.image} size="sm" />
                  <span className="truncate text-sm font-medium text-foreground">
                    {comment.user.name}
                  </span>
                  <span className="font-mono text-xs text-text-muted">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  </span>
                  {isEdited && (
                    <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
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
                <p className="pl-[34px] text-sm leading-relaxed text-foreground">
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
                      className="font-mono uppercase tracking-wider text-text-muted"
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
        )}

        {hasReplies && (
          <Collapsible open={areRepliesOpen} onOpenChange={setAreRepliesOpen} className="mt-3">
            <div className="pl-[34px]">
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="gap-1.5 font-mono uppercase tracking-wider text-text-muted"
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
