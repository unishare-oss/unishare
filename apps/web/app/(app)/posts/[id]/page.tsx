'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  usePostsControllerFindOne,
  usePostsControllerRemove,
} from '@/src/lib/api/generated/posts/posts'
import { useUIStore } from '@/lib/store'
import { useAuth } from '@/contexts/auth-context'
import { PageRail } from '@/components/page-rail'
import { ReadingBar } from '@/components/post-detail/reading-bar'
import { PostBreadcrumb } from '@/components/post-detail/post-breadcrumb'
import { PostHeader } from '@/components/post-detail/post-header'
import { PostFiles } from '@/components/post-detail/post-files'
import { CommentSection } from '@/components/post-detail/comment-section'
import { RelatedPosts } from '@/components/post-detail/related-posts'
import { PostSummary } from '@/components/post-detail/post-summary'
import { PostAiChat } from '@/components/post-detail/post-ai-chat'
import { Skeleton } from '@/components/ui/skeleton'
import { useFilesControllerRemove } from '@/src/lib/api/generated/files/files'

export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { data: post } = usePostsControllerFindOne(id, { query: { select: (r) => r.data } })
  const markRead = useUIStore((s) => s.markRead)
  const [isDeleting, setIsDeleting] = useState(false)

  const { mutateAsync: removeFile } = useFilesControllerRemove()
  const { mutateAsync: removePost } = usePostsControllerRemove()

  useEffect(() => {
    if (post) markRead(post.id)
  }, [post, markRead])

  async function handleDeletePost() {
    if (!post || isDeleting) return

    try {
      setIsDeleting(true)

      for (const file of post.files) {
        await removeFile({ postId: post.id, fileId: file.id })
      }

      await removePost({ id: post.id })

      toast.success('Post deleted')
      router.push('/')
    } catch {
      toast.error('Could not delete post')
      setIsDeleting(false)
    }
  }

  if (!post) {
    return (
      <PageRail>
        <Skeleton className="h-3 w-48" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-3 w-40" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-64 w-full rounded-[var(--r)]" />
      </PageRail>
    )
  }

  return (
    <>
      <ReadingBar />
      <PageRail
        rail={
          <RelatedPosts
            courseId={post.course.id}
            courseCode={post.course.code}
            currentPostId={post.id}
          />
        }
      >
        <PostBreadcrumb
          courseId={post.course.id}
          courseCode={post.course.code}
          courseName={post.course.name}
          title={post.title ?? ''}
        />
        <article className="grid min-w-0 gap-[18px]" aria-label={post.title ?? undefined}>
          <PostHeader
            post={post}
            isOwner={post.isOwner}
            onDelete={handleDeletePost}
            isDeleting={isDeleting}
          />
          <div
            data-note-paper
            className="grid min-w-0 gap-[18px] rounded-[var(--r)] border border-line bg-surface p-[clamp(20px,4.2vw,48px)] font-read text-[17.5px] leading-[1.72] text-ink max-[560px]:text-[17px]"
          >
            <PostSummary post={post} />
            <PostFiles post={post} />
          </div>
        </article>
        {/* Members only: guests are read-only and the API refuses them. */}
        {isAuthenticated && <PostAiChat post={post} />}
        <div id="comments" className="scroll-mt-20">
          <CommentSection postId={post.id} postAuthorId={post.author?.id ?? null} />
        </div>
      </PageRail>
    </>
  )
}
