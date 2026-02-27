'use client'

import { formatDistanceToNow } from 'date-fns'
import { UserAvatar } from '@/components/shared/user-avatar'
import type { ApiPostDetail } from '@/lib/api-types'

interface CommentSectionProps {
  post: ApiPostDetail
  commentText: string
  onCommentChange: (value: string) => void
}

export function CommentSection({ post, commentText, onCommentChange }: CommentSectionProps) {
  return (
    <section className="py-6">
      <h2 className="font-mono text-[11px] uppercase tracking-wider text-text-muted mb-4">
        Comments ({post._count.comments})
      </h2>

      <div className="mb-6">
        <textarea
          value={commentText}
          onChange={(e) => onCommentChange(e.target.value)}
          placeholder="Write a comment..."
          rows={3}
          className="w-full border border-border rounded-[6px] px-4 py-3 text-sm text-foreground placeholder:text-text-muted bg-card focus:outline-none focus:ring-2 focus:ring-amber resize-none"
        />
        <div className="flex justify-end mt-2">
          <button className="h-8 px-4 bg-amber text-primary-foreground text-sm font-medium rounded-[6px] hover:bg-amber-hover transition-colors duration-150">
            Post
          </button>
        </div>
      </div>

      <div className="flex flex-col">
        {post.comments.map((comment) => (
          <div key={comment.id} className="py-4 border-b border-border last:border-b-0">
            {comment.deletedAt !== null ? (
              <p className="text-sm text-text-muted italic">[deleted]</p>
            ) : (
              <>
                <div className="flex items-center gap-2.5 mb-2">
                  <UserAvatar name={comment.user.name} size="sm" />
                  <span className="text-sm font-medium text-foreground">{comment.user.name}</span>
                  <span className="font-mono text-xs text-text-muted">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-foreground leading-relaxed pl-[34px]">
                  {comment.content}
                </p>
              </>
            )}
          </div>
        ))}
        {post.comments.length === 0 && (
          <p className="text-sm text-text-muted font-mono py-4">
            No comments yet. Be the first to comment.
          </p>
        )}
      </div>
    </section>
  )
}
