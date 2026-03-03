'use client'

import Link from 'next/link'
import { Bookmark, FileText, MessageSquare } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { UserAvatar } from '@/components/shared/user-avatar'
import { useUIStore } from '@/lib/store'
import { authClient } from '@/src/lib/auth/client'
import {
  usePostsControllerSavePost,
  usePostsControllerUnsavePost,
  getPostsControllerFindAllQueryKey,
} from '@/src/lib/api/generated/posts/posts'
import type { ApiPost } from '@/lib/api-types'

const typeLabel: Record<string, string> = { NOTE: 'NOTE', OLD_QUESTION: 'PAST EXAM' }

export function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className={cn(
        'font-mono text-[11px] uppercase tracking-wider px-2 py-0.5 border rounded-[4px]',
        type === 'NOTE' ? 'border-info text-info' : 'border-amber text-amber',
      )}
    >
      {typeLabel[type] ?? type}
    </span>
  )
}

export function PostCard({ post }: { post: ApiPost }) {
  const isRead = useUIStore((s) => s.readPostIds.includes(post.id))
  const markRead = useUIStore((s) => s.markRead)
  const toggleSaved = useUIStore((s) => s.toggleSaved)
  const isGuestSaved = useUIStore((s) => s.isGuestSaved)
  const { data: session } = authClient.useSession()
  const queryClient = useQueryClient()

  const isSaved = session ? post.savedByCurrentUser : isGuestSaved(post.id)

  const { mutate: savePost } = usePostsControllerSavePost({
    mutation: {
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: getPostsControllerFindAllQueryKey() }),
    },
  })
  const { mutate: unsavePost } = usePostsControllerUnsavePost({
    mutation: {
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: getPostsControllerFindAllQueryKey() }),
    },
  })

  function handleSave(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (!session) {
      toggleSaved(post)
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

  const currentYear = new Date().getFullYear()
  const yearLevel = post.author.enrollmentYear ? currentYear - post.author.enrollmentYear + 1 : null

  return (
    <Link href={`/posts/${post.id}`} className="block" onClick={() => markRead(post.id)}>
      <article className="relative flex items-start justify-between px-6 py-5 border-b border-border hover:bg-muted transition-colors duration-150 cursor-pointer">
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 mb-1.5">
            <TypeBadge type={post.type} />
            <span className="font-mono text-[13px] text-amber font-medium">{post.course.code}</span>
            <span className="text-text-muted text-[13px]">{'·'}</span>
            <span className="text-text-muted text-[13px]">{post.course.department.name}</span>
          </div>
          <h3
            className={cn(
              'text-base font-medium mb-2 line-clamp-1',
              isRead ? 'text-text-muted' : 'text-foreground',
            )}
          >
            {post.title}
          </h3>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="flex items-center gap-1">
              <UserAvatar
                name={post.author.name}
                image={post.author.image}
                size="xs"
                className="shrink-0"
              />
              <span className="font-mono text-xs text-foreground">{post.author.name}</span>
            </span>
            {yearLevel != null && (
              <>
                <span className="text-text-muted text-xs">{'·'}</span>
                <span className="font-mono text-xs text-text-muted">Year {yearLevel}</span>
              </>
            )}
            <span className="text-text-muted text-xs">{'·'}</span>
            <span className="flex items-center gap-1">
              <FileText className="size-3.5 text-text-muted" strokeWidth={1.5} />
              <span className="font-mono text-xs text-text-muted">
                {post.files.length} {post.files.length === 1 ? 'file' : 'files'}
              </span>
            </span>
            <span className="text-text-muted text-xs">{'·'}</span>
            <span className="flex items-center gap-1">
              <MessageSquare className="size-3.5 text-text-muted" strokeWidth={1.5} />
              <span className="font-mono text-xs text-text-muted">
                {post._count.comments} comments
              </span>
            </span>
            <span className="text-text-muted text-xs">{'·'}</span>
            <span className="font-mono text-xs text-text-muted">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>
        <button
          className="p-2 rounded-[6px] hover:bg-background transition-colors duration-150 shrink-0 mt-1"
          onClick={handleSave}
          aria-label={isSaved ? 'Unsave post' : 'Save post'}
        >
          <Bookmark
            className={cn('size-4', isSaved ? 'fill-amber text-amber' : 'text-text-muted')}
            strokeWidth={1.5}
          />
        </button>
      </article>
    </Link>
  )
}
