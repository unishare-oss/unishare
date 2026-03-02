'use client'

import { useState } from 'react'
import { Bookmark, Link2, Pencil, Trash2, Check } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { TypeBadge } from '@/components/post-card'
import { UserAvatar } from '@/components/shared/user-avatar'
import { useUIStore } from '@/lib/store'
import { authClient } from '@/src/lib/auth/client'
import {
  usePostsControllerSavePost,
  usePostsControllerUnsavePost,
  getPostsControllerFindAllQueryKey,
  getPostsControllerFindOneQueryKey,
} from '@/src/lib/api/generated/posts/posts'
import type { ApiPost, ApiPostDetail } from '@/lib/api-types'

interface PostHeaderProps {
  post: ApiPostDetail
  isOwner: boolean
}

export function PostHeader({ post, isOwner }: PostHeaderProps) {
  const [copied, setCopied] = useState(false)
  const { data: session } = authClient.useSession()
  const toggleSaved = useUIStore((s) => s.toggleSaved)
  const isGuestSaved = useUIStore((s) => s.isGuestSaved)
  const queryClient = useQueryClient()

  const isSaved = session ? post.savedByCurrentUser : isGuestSaved(post.id)

  const { mutate: savePost } = usePostsControllerSavePost({
    mutation: {
      onSuccess: () => {
        ;(queryClient.invalidateQueries({ queryKey: getPostsControllerFindAllQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getPostsControllerFindOneQueryKey(post.id) }))
      },
    },
  })

  const { mutate: unsavePost } = usePostsControllerUnsavePost({
    mutation: {
      onSuccess: () => {
        ;(queryClient.invalidateQueries({ queryKey: getPostsControllerFindAllQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getPostsControllerFindOneQueryKey(post.id) }))
      },
    },
  })

  function handleSave() {
    if (!session) {
      toggleSaved(post as unknown as ApiPost)
      toast.success(isSaved ? 'Removed from saved posts' : 'Saved post')
    } else if (isSaved) {
      unsavePost(
        { id: post.id },
        {
          onSuccess: () => {
            toast.success('Removed from saved posts')
          },
          onError: () => {
            toast.error('Could not update saved posts')
          },
        },
      )
    } else {
      savePost(
        { id: post.id },
        {
          onSuccess: () => {
            toast.success('Saved post')
          },
          onError: () => {
            toast.error('Could not update saved posts')
          },
        },
      )
    }
  }

  function handleShare() {
    navigator.clipboard.writeText(post.shortCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const currentYear = new Date().getFullYear()
  const yearLevel = post.author.enrollmentYear ? currentYear - post.author.enrollmentYear + 1 : null

  return (
    <>
      {post.status === 'PENDING' && (
        <div className="mb-6 bg-amber-subtle border border-amber/50 px-4 py-3 rounded-[6px]">
          <p className="text-sm text-amber font-medium">
            This post is pending review and is only visible to you.
          </p>
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <TypeBadge type={post.type} />
          <span className="font-mono text-[13px] text-amber font-medium">{post.course.code}</span>
        </div>
        <h1 className="text-[28px] font-semibold text-foreground tracking-tight leading-tight mt-2 text-balance">
          {post.title}
        </h1>
        <div className="flex items-center gap-1.5 mt-3 font-mono text-xs text-text-muted flex-wrap">
          {post.year != null && <span>Year {post.year}</span>}
          {post.year != null && post.semester != null && <span>{'·'}</span>}
          {post.semester != null && <span>Semester {post.semester}</span>}
          {post.moduleNumber != null && (
            <>
              <span>{'·'}</span>
              <span>Module {post.moduleNumber}</span>
            </>
          )}
          {post.examYear != null && (
            <>
              <span>{'·'}</span>
              <span>{post.examYear} Exam</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3 mt-4">
          <UserAvatar name={post.author.name} image={post.author.image} size="md" />
          <div>
            <p className="text-sm font-medium text-foreground">{post.author.name}</p>
            <p className="font-mono text-xs text-text-muted">
              {yearLevel != null && `Year ${yearLevel} student · `}
              {post.author.department?.name && `${post.author.department.name} · `}
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 justify-end mb-6">
        <button
          onClick={handleSave}
          className="p-2 rounded-[6px] hover:bg-muted transition-colors duration-150"
          aria-label={isSaved ? 'Unsave post' : 'Save post'}
        >
          <Bookmark
            className={cn('size-4', isSaved ? 'fill-amber text-amber' : 'text-text-muted')}
            strokeWidth={1.5}
          />
        </button>
        <button
          onClick={handleShare}
          className="p-2 rounded-[6px] hover:bg-muted transition-colors duration-150"
          aria-label={copied ? 'Copied!' : 'Copy share code'}
        >
          {copied ? (
            <Check className="size-4 text-success" strokeWidth={1.5} />
          ) : (
            <Link2 className="size-4 text-text-muted" strokeWidth={1.5} />
          )}
        </button>
        {isOwner && (
          <>
            <button
              className="p-2 rounded-[6px] hover:bg-muted transition-colors duration-150"
              aria-label="Edit"
            >
              <Pencil className="size-4 text-text-muted" strokeWidth={1.5} />
            </button>
            <button
              className="p-2 rounded-[6px] hover:bg-muted hover:text-destructive transition-colors duration-150"
              aria-label="Delete"
            >
              <Trash2 className="size-4 text-text-muted" strokeWidth={1.5} />
            </button>
          </>
        )}
      </div>

      <div className="border-t border-border" />
    </>
  )
}
