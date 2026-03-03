'use client'

import { use, useEffect } from 'react'
import { usePostsControllerFindOne } from '@/src/lib/api/generated/posts/posts'
import { useUIStore } from '@/lib/store'
import { authClient } from '@/src/lib/auth/client'
import { PageHeader } from '@/components/shared/page-header'
import { PostBreadcrumb } from '@/components/post-detail/post-breadcrumb'
import { PostHeader } from '@/components/post-detail/post-header'
import { PostFiles } from '@/components/post-detail/post-files'
import { CommentSection } from '@/components/post-detail/comment-section'
import { LoadingSpinner } from '@/components/shared/loading-spinner'

export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: post } = usePostsControllerFindOne(id, { query: { select: (r) => r.data } })
  const { data: session } = authClient.useSession()
  const markRead = useUIStore((s) => s.markRead)

  useEffect(() => {
    if (post) markRead(post.id)
  }, [post, markRead])

  if (!post) {
    return (
      <div className="flex flex-col min-h-screen">
        <PageHeader title="Post" />
        <div className="flex-1 bg-card flex items-center justify-center">
          <LoadingSpinner className="size-20" />
        </div>
      </div>
    )
  }

  const isOwner = session?.user?.id === post.authorId

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Post" />

      <div className="flex-1 bg-card">
        <div className="max-w-[800px] mx-auto px-6 py-6">
          <PostBreadcrumb
            courseCode={post.course.code}
            courseName={post.course.name}
            title={post.title ?? ''}
          />
          <PostHeader post={post} isOwner={isOwner} />
          <PostFiles post={post} />
          <div className="border-t border-border" />
          <CommentSection postId={post.id} postAuthorId={post.authorId} />
        </div>
      </div>
    </div>
  )
}
