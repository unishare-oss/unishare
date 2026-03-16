'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CommentListSkeleton } from '@/components/post-detail/comment-list-skeleton'
import { CommentThreadItem } from '@/components/post-detail/comment-thread-item'
import {
  getCommentsControllerFindAllQueryKey,
  useCommentsControllerCreate,
  useCommentsControllerFindAll,
  useCommentsControllerCreateReply,
  useCommentsControllerRemove,
  useCommentsControllerUpdate,
} from '@/src/lib/api/generated/comments/comments'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { pluralize } from '@/lib/utils'

interface CommentSectionProps {
  postId: string
  postAuthorId?: string | null
}

interface DraftState {
  commentText: string
  editingCommentId: string | null
  editText: string
  replyCommentId: string | null
  replyText: string
}

const INITIAL_DRAFT_STATE: DraftState = {
  commentText: '',
  editingCommentId: null,
  editText: '',
  replyCommentId: null,
  replyText: '',
}

export function CommentSection({ postId, postAuthorId }: CommentSectionProps) {
  const [error, setError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<DraftState>(INITIAL_DRAFT_STATE)

  const { user, isAuthenticated } = useAuth()

  // Orval/TanStack server state
  const queryClient = useQueryClient()
  const { data: comments = [], isLoading } = useCommentsControllerFindAll(postId, {
    query: { select: (response) => response.data },
  })
  const { mutateAsync: createComment, isPending } = useCommentsControllerCreate()
  const { mutateAsync: createReply, isPending: isReplying } = useCommentsControllerCreateReply()
  const { mutateAsync: updateComment, isPending: isUpdating } = useCommentsControllerUpdate()
  const { mutateAsync: removeComment, isPending: isRemoving } = useCommentsControllerRemove()

  const { commentText, editingCommentId, editText, replyCommentId, replyText } = drafts

  const commentThreadViewer = {
    user,
    postAuthorId: postAuthorId ?? null,
    isAuthenticated,
  }

  const commentThreadEditState = {
    editingCommentId,
    editText,
  }
  const commentThreadReplyState = {
    replyCommentId,
    replyText,
  }

  const commentThreadPendingState = {
    isUpdating,
    isRemoving,
    isReplying,
  }

  function setEditingState(commentId: string | null, editText = '') {
    setError(null)
    setDrafts((current) => ({
      ...current,
      editingCommentId: commentId,
      editText,
    }))
  }

  function startEditing(commentId: string, content: string) {
    setEditingState(commentId, content)
  }

  function cancelEditing() {
    setEditingState(null)
  }

  function setReplyState(commentId: string | null, replyText = '') {
    setError(null)
    setDrafts((current) => ({
      ...current,
      replyCommentId: commentId,
      replyText,
    }))
  }

  function startReply(commentId: string) {
    setReplyState(commentId)
  }

  function cancelReply() {
    setReplyState(null)
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

  async function handleSubmit() {
    const content = commentText.trim()

    if (!content || !isAuthenticated) return

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

  async function handleReplySubmit(commentId: string) {
    const content = replyText.trim()

    if (!content || !isAuthenticated) return

    setError(null)

    try {
      await createReply({ postId, commentId, data: { content } })
      cancelReply()
      await queryClient.invalidateQueries({
        queryKey: getCommentsControllerFindAllQueryKey(postId),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post reply')
    }
  }

  async function handleDelete(commentId: string) {
    setError(null)

    try {
      await removeComment({ postId, commentId })
      if (editingCommentId === commentId) {
        cancelEditing()
      }
      if (replyCommentId === commentId) {
        cancelReply()
      }
      await queryClient.invalidateQueries({
        queryKey: getCommentsControllerFindAllQueryKey(postId),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete comment')
    }
  }

  const commentThreadEditActions = {
    start: startEditing,
    cancel: cancelEditing,
    change: (value: string) => setDrafts((current) => ({ ...current, editText: value })),
    submit: handleUpdate,
  }
  const commentThreadReplyActions = {
    start: startReply,
    cancel: cancelReply,
    change: (value: string) => setDrafts((current) => ({ ...current, replyText: value })),
    submit: handleReplySubmit,
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
            disabled={!isAuthenticated || !commentText.trim() || isPending}
            className="bg-amber text-primary-foreground hover:bg-amber-hover"
          >
            {isPending ? 'Posting...' : 'Post'}
          </Button>
        </div>
        {!isAuthenticated && (
          <p className="text-xs text-text-muted mt-2">Sign in to post a comment.</p>
        )}
        {error && <p className="text-xs text-destructive mt-2">{error}</p>}
      </div>

      <div className="flex flex-col">
        {isLoading && comments.length === 0 && <CommentListSkeleton />}
        {comments.map((comment) => {
          return (
            <CommentThreadItem
              key={comment.id}
              comment={comment}
              depth={0}
              viewer={commentThreadViewer}
              editState={commentThreadEditState}
              replyState={commentThreadReplyState}
              pendingState={commentThreadPendingState}
              editActions={commentThreadEditActions}
              replyActions={commentThreadReplyActions}
              onDelete={handleDelete}
            />
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
