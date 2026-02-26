'use client'

import { use, useState } from 'react'
import { posts, currentUser } from '@/lib/mock-data'
import { PageHeader } from '@/components/shared/page-header'
import { PostBreadcrumb } from '@/components/post-detail/post-breadcrumb'
import { PostHeader } from '@/components/post-detail/post-header'
import { PostFiles } from '@/components/post-detail/post-files'
import { CommentSection } from '@/components/post-detail/comment-section'

export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const post = posts.find((p) => p.id === id) ?? posts[0]
  const isOwner = post.author.id === currentUser.id
  const [commentText, setCommentText] = useState('')

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Post" />

      <div className="flex-1 bg-card">
        <div className="max-w-[800px] mx-auto px-6 py-6">
          <PostBreadcrumb
            courseCode={post.courseCode}
            courseName={post.courseName}
            title={post.title}
          />
          <PostHeader post={post} isOwner={isOwner} />
          <PostFiles post={post} />
          <div className="border-t border-border" />
          <CommentSection post={post} commentText={commentText} onCommentChange={setCommentText} />
        </div>
      </div>
    </div>
  )
}
