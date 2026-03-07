'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { usePostsControllerFindAll } from '@/src/lib/api/generated/posts/posts'

interface RelatedPostsProps {
  courseId: string
  currentPostId: string
}

export function RelatedPosts({ courseId, currentPostId }: RelatedPostsProps) {
  const { data } = usePostsControllerFindAll(
    { courseId, limit: 6 },
    { query: { select: (r) => r.data } },
  )

  const related = (data?.items ?? []).filter((p) => p.id !== currentPostId).slice(0, 5)

  if (related.length === 0) return null

  return (
    <div className="mt-6 mb-2">
      <h3 className="font-mono text-[11px] uppercase tracking-wider text-text-muted mb-3">
        More from this course
      </h3>
      <div className="flex flex-col border border-border rounded-[6px] overflow-hidden bg-card">
        {related.map((post, i) => (
          <Link
            key={post.id}
            href={`/posts/${post.id}`}
            className={`flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors duration-150 ${
              i < related.length - 1 ? 'border-b border-border' : ''
            }`}
          >
            <span
              className={`shrink-0 size-1.5 rounded-full ${post.type === 'NOTE' ? 'bg-info' : 'bg-amber'}`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground line-clamp-1">{post.title}</p>
              <p className="font-mono text-xs text-text-muted mt-0.5">
                {post.author.name} ·{' '}
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </p>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted shrink-0">
              {post.type === 'NOTE' ? 'Note' : 'Past Exam'}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
