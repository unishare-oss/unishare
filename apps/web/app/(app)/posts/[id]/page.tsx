'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  usePostsControllerFindOne,
  usePostsControllerRemove,
} from '@/src/lib/api/generated/posts/posts'
import { useUIStore, useFeedStyleStore } from '@/lib/store'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/shared/page-header'
import { PostBreadcrumb } from '@/components/post-detail/post-breadcrumb'
import { PostHeader } from '@/components/post-detail/post-header'
import { PostFiles } from '@/components/post-detail/post-files'
import { CommentSection } from '@/components/post-detail/comment-section'
import { PostReactions } from '@/components/post-detail/post-reactions'
import { PostSummary } from '@/components/post-detail/post-summary'
import { PostAiChat } from '@/components/post-detail/post-ai-chat'
import { PageRail } from '@/components/page-rail'
import { NoteRail } from '@/components/post-detail/note-rail'
import { ReadingBar } from '@/components/post-detail/reading-bar'
import { Skeleton } from '@/components/ui/skeleton'
import { useFilesControllerRemove } from '@/src/lib/api/generated/files/files'

export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { data: post } = usePostsControllerFindOne(id, { query: { select: (r) => r.data } })
  const markRead = useUIStore((s) => s.markRead)
  const feedStyle = useFeedStyleStore((s) => s.feedStyle)
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
      <div
        className="flex flex-col min-h-[calc(100dvh-var(--mobile-topbar-h,0px))]"
        data-detail-style={feedStyle}
      >
        <PageHeader title="Post" />
        <div className={cn('flex-1', feedStyle === 'classic' ? 'bg-card' : 'bg-background')}>
          <div className={cn('mx-auto px-4 py-4 md:px-6 md:py-6 space-y-4', 'max-w-300')}>
            <Skeleton className="h-3 w-48" />
            <div className="space-y-3 pt-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-3 w-40" />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Skeleton className="size-10 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  const isOwner = post.isOwner

  return (
    <div
      className="calm flex flex-col min-h-[calc(100dvh-var(--mobile-topbar-h,0px))]"
      data-detail-style={feedStyle}
    >
      <ReadingBar />
      <PageHeader title={post.title ?? 'Post'} />

      <div className="flex-1 bg-background">
        <div className="mx-auto max-w-[1440px] px-4 py-4 md:px-6 md:py-6">
          <PostBreadcrumb
            courseCode={post.course.code}
            courseName={post.course.name}
            title={post.title ?? ''}
          />
          <div className="mt-6">
            <PageRail
              rail={
                <NoteRail
                  courseId={post.course.id}
                  courseName={post.course.name}
                  postId={post.id}
                />
              }
            >
              <div className="rounded-card border border-line bg-surface p-5 md:p-7">
                <PostHeader
                  post={post}
                  isOwner={isOwner}
                  onDelete={handleDeletePost}
                  isDeleting={isDeleting}
                  actionExtras={<PostReactions post={post} likeOnly />}
                />
              </div>
              <article
                data-note-paper
                className="mt-6 rounded-card border border-line bg-surface px-6 py-7 md:px-10 md:py-10"
              >
                {post.summary && <PostSummary post={post} />}
                <div className="font-read text-base leading-[1.85] text-ink [&_.markdown]:font-read [&_.markdown_p]:text-base [&_.markdown_h1]:text-2xl [&_.markdown_h2]:text-xl [&_.markdown_h3]:text-lg">
                  <PostFiles post={post} />
                </div>
              </article>
              {/* Members only: guests are read-only and the API refuses them. */}
              {isAuthenticated && (
                <div className="mt-5">
                  <PostAiChat post={post} />
                </div>
              )}
              <div className="mt-8">
                <CommentSection postId={post.id} postAuthorId={post.author?.id ?? null} />
              </div>
            </PageRail>
          </div>
        </div>
      </div>
    </div>
  )
}
