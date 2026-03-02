'use client'

import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useQueryClient } from '@tanstack/react-query'
import { UserAvatar } from '@/components/shared/user-avatar'
import {
  getCommentsControllerFindAllQueryKey,
  useCommentsControllerCreate,
  useCommentsControllerFindAll,
  useCommentsControllerRemove,
  useCommentsControllerUpdate,
} from '@/src/lib/api/generated/comments/comments'
import { authClient } from '@/src/lib/auth/client'

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
        Comments ({comments.length})
      </h2>

      <div className="mb-6">
        <textarea
          value={commentText}
          onChange={(e) => setDrafts((current) => ({ ...current, commentText: e.target.value }))}
          placeholder="Write a comment..."
          rows={3}
          className="w-full border border-border rounded-[6px] px-4 py-3 text-sm text-foreground placeholder:text-text-muted bg-card focus:outline-none focus:ring-2 focus:ring-amber resize-none"
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={handleSubmit}
            disabled={!session || !commentText.trim() || isPending}
            className="h-8 px-4 bg-amber text-primary-foreground text-sm font-medium rounded-[6px] hover:bg-amber-hover transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending ? 'Posting...' : 'Post'}
          </button>
        </div>
        {!session && <p className="text-xs text-text-muted mt-2">Sign in to post a comment.</p>}
        {error && <p className="text-xs text-destructive mt-2">{error}</p>}
      </div>

      <div className="flex flex-col">
        {isLoading && <p className="text-sm text-text-muted font-mono py-4">Loading comments...</p>}
        {comments.map((comment) => (
          <div key={comment.id} className="group py-4 border-b border-border last:border-b-0">
            {comment.deletedAt !== null ? (
              <p className="text-sm text-text-muted italic">[deleted]</p>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <UserAvatar name={comment.user.name} size="sm" />
                    <span className="text-sm font-medium text-foreground">{comment.user.name}</span>
                    <span className="font-mono text-xs text-text-muted">
                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  {currentUserId && (
                    <div className="flex items-center gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150">
                      {comment.userId === currentUserId && (
                        <button
                          type="button"
                          onClick={() => startEditing(comment.id, comment.content)}
                          disabled={isUpdating || isRemoving}
                          className="p-1.5 rounded-[6px] hover:bg-muted transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
                          aria-label="Edit comment"
                        >
                          <Pencil className="size-3.5 text-text-muted" strokeWidth={1.5} />
                        </button>
                      )}
                      {(comment.userId === currentUserId ||
                        postAuthorId === currentUserId ||
                        currentUserRole === 'ADMIN') && (
                        <button
                          type="button"
                          onClick={() => handleDelete(comment.id)}
                          disabled={isUpdating || isRemoving}
                          className="p-1.5 rounded-[6px] hover:bg-muted transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
                          aria-label="Delete comment"
                        >
                          <Trash2
                            className="size-3.5 text-text-muted hover:text-destructive"
                            strokeWidth={1.5}
                          />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {editingCommentId === comment.id ? (
                  <div className="pl-[34px] space-y-3">
                    <textarea
                      value={editText}
                      onChange={(e) =>
                        setDrafts((current) => ({ ...current, editText: e.target.value }))
                      }
                      rows={3}
                      className="w-full border border-border rounded-[6px] px-4 py-3 text-sm text-foreground placeholder:text-text-muted bg-card focus:outline-none focus:ring-2 focus:ring-amber resize-none"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={cancelEditing}
                        disabled={isUpdating}
                        className="h-8 px-3 border border-border rounded-[6px] text-sm text-text-muted hover:bg-muted transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdate(comment.id)}
                        disabled={!editText.trim() || isUpdating}
                        className="h-8 px-4 bg-amber text-primary-foreground text-sm font-medium rounded-[6px] hover:bg-amber-hover transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isUpdating ? 'Saving...' : 'Save'}
                      </button>
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
        ))}
        {!isLoading && comments.length === 0 && (
          <p className="text-sm text-text-muted font-mono py-4">
            No comments yet. Be the first to comment.
          </p>
        )}
      </div>
    </section>
  )
}
