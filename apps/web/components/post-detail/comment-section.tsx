'use client'

import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useQueryClient } from '@tanstack/react-query'
import { CommentListSkeleton } from '@/components/post-detail/comment-list-skeleton'
import { UserAvatar } from '@/components/shared/user-avatar'
import {
  getCommentsControllerFindAllQueryKey,
  useCommentsControllerCreate,
  useCommentsControllerFindAll,
  useCommentsControllerRemove,
  useCommentsControllerUpdate,
} from '@/src/lib/api/generated/comments/comments'
import { authClient } from '@/src/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { pluralize } from '@/lib/utils'

interface CommentSectionProps {
  postId: string
  postAuthorId: string
}

interface DraftState {
  commentText: string
  editingCommentId: string | null
  editText: string
}

const INITIAL_DRAFT_STATE: DraftState = {
  commentText: '',
  editingCommentId: null,
  editText: '',
}

export function CommentSection({ postId, postAuthorId }: CommentSectionProps) {
  const [error, setError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<DraftState>(INITIAL_DRAFT_STATE)

  const { data: session } = authClient.useSession()

  // Orval/TanStack server state
  const queryClient = useQueryClient()
  const { data: comments = [], isLoading } = useCommentsControllerFindAll(postId, {
    query: { select: (response) => response.data },
  })
  const { mutateAsync: createComment, isPending } = useCommentsControllerCreate()
  const { mutateAsync: updateComment, isPending: isUpdating } = useCommentsControllerUpdate()
  const { mutateAsync: removeComment, isPending: isRemoving } = useCommentsControllerRemove()

  const currentUserId = session?.user?.id ?? null
  const currentUserRole = session?.user?.role
  const { commentText, editingCommentId, editText } = drafts

  async function handleSubmit() {
    const content = commentText.trim()

    if (!content || !session) return

    setError(null)

    try {
      await createComment({ postId, data: { content } })
      setDrafts((current) => ({ ...current, commentText: '' }))
      await queryClient.invalidateQueries({
        queryKey: getCommentsControllerFindAllQueryKey(postId),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post comment')
    }
  }

  function startEditing(commentId: string, content: string) {
    setError(null)
    setDrafts((current) => ({
      ...current,
      editingCommentId: commentId,
      editText: content,
    }))
  }

  function cancelEditing() {
    setError(null)
    setDrafts((current) => ({
      ...current,
      editingCommentId: null,
      editText: '',
    }))
  }

  async function handleUpdate(commentId: string) {
    const content = editText.trim()

    if (!content) {
      setError('Comment cannot be empty')
      return
    }

    setError(null)

    try {
      await updateComment({ postId, commentId, data: { content } })
      cancelEditing()
      await queryClient.invalidateQueries({
        queryKey: getCommentsControllerFindAllQueryKey(postId),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update comment')
    }
  }

  async function handleDelete(commentId: string) {
    setError(null)

    try {
      await removeComment({ postId, commentId })
      if (editingCommentId === commentId) {
        cancelEditing()
      }
      await queryClient.invalidateQueries({
        queryKey: getCommentsControllerFindAllQueryKey(postId),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete comment')
    }
  }

  return (
    <section className="py-6">
      <h2 className="font-mono text-[11px] uppercase tracking-wider text-text-muted mb-4">
        {comments.length} {pluralize(comments.length, 'Comment')}
      </h2>

      <div className="mb-6">
        <Textarea
          value={commentText}
          onChange={(e) => setDrafts((current) => ({ ...current, commentText: e.target.value }))}
          placeholder="Write a comment..."
          rows={3}
          className="resize-none"
        />
        <div className="flex justify-end mt-2">
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!session || !commentText.trim() || isPending}
            className="bg-amber text-primary-foreground hover:bg-amber-hover"
          >
            {isPending ? 'Posting...' : 'Post'}
          </Button>
        </div>
        {!session && <p className="text-xs text-text-muted mt-2">Sign in to post a comment.</p>}
        {error && <p className="text-xs text-destructive mt-2">{error}</p>}
      </div>

      <div className="flex flex-col">
        {isLoading && comments.length === 0 && <CommentListSkeleton />}
        {comments.map((comment) => {
          const isEdited = comment.updatedAt !== comment.createdAt

          return (
            <div key={comment.id} className="group py-4 border-b border-border last:border-b-0">
              {comment.deletedAt !== null ? (
                <p className="text-sm text-text-muted italic">[deleted]</p>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <UserAvatar name={comment.user.name} image={comment.user.image} size="sm" />
                      <span className="text-sm font-medium text-foreground">
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
                    {currentUserId && (
                      <div className="flex items-center gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150">
                        {comment.userId === currentUserId && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => startEditing(comment.id, comment.content)}
                            disabled={isUpdating || isRemoving}
                            aria-label="Edit comment"
                          >
                            <Pencil className="size-3.5 text-text-muted" strokeWidth={1.5} />
                          </Button>
                        )}
                        {(comment.userId === currentUserId ||
                          postAuthorId === currentUserId ||
                          currentUserRole === 'ADMIN') && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleDelete(comment.id)}
                            disabled={isUpdating || isRemoving}
                            aria-label="Delete comment"
                          >
                            <Trash2 className="size-3.5 text-text-muted" strokeWidth={1.5} />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  {editingCommentId === comment.id ? (
                    <div className="pl-[34px] space-y-3">
                      <Textarea
                        value={editText}
                        onChange={(e) =>
                          setDrafts((current) => ({ ...current, editText: e.target.value }))
                        }
                        rows={3}
                        className="resize-none"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={cancelEditing}
                          disabled={isUpdating}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleUpdate(comment.id)}
                          disabled={!editText.trim() || isUpdating}
                          className="bg-amber text-primary-foreground hover:bg-amber-hover"
                        >
                          {isUpdating ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-foreground leading-relaxed pl-[34px]">
                      {comment.content}
                    </p>
                  )}
                </>
              )}
            </div>
          )
        })}
        {!isLoading && comments.length === 0 && (
          <p className="text-sm text-text-muted font-mono py-4">
            No comments yet. Be the first to comment.
          </p>
        )}
      </div>
    </section>
  )
}
