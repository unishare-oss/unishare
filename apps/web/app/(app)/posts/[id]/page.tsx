'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { usePostsControllerFindOne } from '@/src/lib/api/generated/posts/posts'
import { useUIStore } from '@/lib/store'
import { authClient } from '@/src/lib/auth/client'
import { PageHeader } from '@/components/shared/page-header'
import { PostBreadcrumb } from '@/components/post-detail/post-breadcrumb'
import { PostHeader } from '@/components/post-detail/post-header'
import { PostFiles } from '@/components/post-detail/post-files'
import { CommentSection } from '@/components/post-detail/comment-section'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import {
  getPostsControllerFindAllQueryKey,
  getPostsControllerFindOneQueryKey,
  getPostsControllerGetSavedPostsQueryKey,
  usePostsControllerRemove,
} from '@/src/lib/api/generated/posts/posts'
import { useFilesControllerRemove } from '@/src/lib/api/generated/files/files'

export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: post } = usePostsControllerFindOne(id, { query: { select: (r) => r.data } })
  const { data: session } = authClient.useSession()
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
        {/* g change later */}
        <div className="max-w-240 mx-auto px-6 py-6">
          <PostBreadcrumb
            courseCode={post.course.code}
            courseName={post.course.name}
            title={post.title ?? ''}
          />
          <PostHeader
            post={post}
            isOwner={isOwner}
            onDelete={handleDeletePost}
            isDeleting={isDeleting}
          />
          <PostFiles post={post} />
          <div className="border-t border-border" />
          <CommentSection postId={post.id} postAuthorId={post.authorId} />
        </div>
      </div>
    </div>
  )
}
