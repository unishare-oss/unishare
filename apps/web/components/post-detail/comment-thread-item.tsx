'use client'

import { formatDistanceToNow } from 'date-fns'
import { MessageSquareReply, Pencil, Trash2 } from 'lucide-react'
import { UserAvatar } from '@/components/shared/user-avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { CommentEntity } from '@/src/lib/api/generated/unishareAPI.schemas'
import { cn } from '@/lib/utils'

interface CommentThreadItemProps {
  comment: CommentEntity
  depth: number
  currentUserId: string | null
  currentUserRole?: string
  postAuthorId?: string | null
  isAuthenticated: boolean
  editingCommentId: string | null
  editText: string
  replyCommentId: string | null
  replyText: string
  isUpdating: boolean
  isRemoving: boolean
  isReplying: boolean
  onStartEditing: (commentId: string, content: string) => void
  onCancelEditing: () => void
  onEditTextChange: (value: string) => void
  onUpdate: (commentId: string) => void
  onDelete: (commentId: string) => void
  onStartReply: (commentId: string) => void
  onCancelReply: () => void
  onReplyTextChange: (value: string) => void
  onReplySubmit: (commentId: string) => void
}

export function CommentThreadItem({
  comment,
  depth,
  currentUserId,
  currentUserRole,
  postAuthorId,
  isAuthenticated,
  editingCommentId,
  editText,
  replyCommentId,
  replyText,
  isUpdating,
  isRemoving,
  isReplying,
  onStartEditing,
  onCancelEditing,
  onEditTextChange,
  onUpdate,
  onDelete,
  onStartReply,
  onCancelReply,
  onReplyTextChange,
  onReplySubmit,
}: CommentThreadItemProps) {
  const isEdited = comment.updatedAt !== comment.createdAt
  const canEdit = comment.deletedAt === null && comment.userId === currentUserId
  const canDelete =
    comment.deletedAt === null &&
    (comment.userId === currentUserId ||
      (postAuthorId != null && postAuthorId === currentUserId) ||
      currentUserRole === 'ADMIN')
  const canReply = isAuthenticated && comment.deletedAt === null
  const hasReplies = (comment.children?.length ?? 0) > 0
  const isEditing = editingCommentId === comment.id
  const isReplyingToComment = replyCommentId === comment.id

  return (
    <div
      className={cn('group py-4 border-b border-border last:border-b-0', depth > 0 && 'pb-0')}
      style={depth > 0 ? { marginLeft: Math.min(depth, 4) * 28 } : undefined}
    >
      <div className={cn(depth > 0 && 'border-l border-border/70 pl-4 sm:pl-5')}>
        {comment.deletedAt !== null ? (
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
                <div className="mt-1.5 flex items-center gap-1 pl-[34px]">
                  {canReply && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => onStartReply(comment.id)}
                      disabled={isReplying}
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
                      onClick={() => onStartEditing(comment.id, comment.content)}
                      disabled={isUpdating || isRemoving}
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
                      disabled={isUpdating || isRemoving}
                      aria-label="Delete comment"
                    >
                      <Trash2 className="size-3.5 text-text-muted" strokeWidth={1.5} />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-3 pl-[34px]">
                <Textarea
                  value={editText}
                  onChange={(e) => onEditTextChange(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onCancelEditing}
                    disabled={isUpdating}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onUpdate(comment.id)}
                    disabled={!editText.trim() || isUpdating}
                    className="bg-amber text-primary-foreground hover:bg-amber-hover"
                  >
                    {isUpdating ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="pl-[34px] text-sm leading-relaxed text-foreground">{comment.content}</p>
            )}

            {isReplyingToComment && (
              <div className="mt-3 space-y-3 pl-[34px]">
                <Textarea
                  value={replyText}
                  onChange={(e) => onReplyTextChange(e.target.value)}
                  placeholder={`Reply to ${comment.user.name}...`}
                  rows={3}
                  className="resize-none"
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onCancelReply}
                    disabled={isReplying}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onReplySubmit(comment.id)}
                    disabled={!replyText.trim() || isReplying}
                    className="bg-amber text-primary-foreground hover:bg-amber-hover"
                  >
                    {isReplying ? 'Replying...' : 'Reply'}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {hasReplies && (
          <div className="mt-2">
            {comment.children?.map((child) => (
              <CommentThreadItem
                key={child.id}
                comment={child}
                depth={depth + 1}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                postAuthorId={postAuthorId}
                isAuthenticated={isAuthenticated}
                editingCommentId={editingCommentId}
                editText={editText}
                replyCommentId={replyCommentId}
                replyText={replyText}
                isUpdating={isUpdating}
                isRemoving={isRemoving}
                isReplying={isReplying}
                onStartEditing={onStartEditing}
                onCancelEditing={onCancelEditing}
                onEditTextChange={onEditTextChange}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onStartReply={onStartReply}
                onCancelReply={onCancelReply}
                onReplyTextChange={onReplyTextChange}
                onReplySubmit={onReplySubmit}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
