'use client'

import Link from 'next/link'
import { getPostType } from '@/lib/posts/post-type'
import { usePostsControllerFindAll } from '@/src/lib/api/generated/posts/posts'

interface RelatedPostsProps {
  courseId: string
  courseCode: string
  currentPostId: string
}

export function RelatedPosts({ courseId, courseCode, currentPostId }: RelatedPostsProps) {
  const { data } = usePostsControllerFindAll(
    { courseId, limit: 6 },
    { query: { select: (r) => r.data } },
  )

  const related = (data?.items ?? []).filter((p) => p.id !== currentPostId).slice(0, 5)

  if (related.length === 0) return null

  return (
    <section className="grid gap-2.5 py-1">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
        More from {courseCode}
      </h2>
      <ul className="m-0 grid list-none gap-2.5 p-0">
        {related.map((post) => (
          <li key={post.id}>
            <Link
              href={`/posts/${post.id}`}
              className="group grid gap-0.5 text-sm font-medium leading-[1.35] text-ink no-underline"
            >
              <span className="group-hover:underline">{post.title}</span>
              <small className="text-xs font-normal text-muted-foreground">
                {[
                  getPostType(post.type).label,
                  post.moduleNumber != null && `Module ${post.moduleNumber}`,
                  post.author?.name ?? 'A classmate',
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </small>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
