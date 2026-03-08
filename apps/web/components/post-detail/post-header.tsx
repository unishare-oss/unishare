'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Bookmark, Link2, Pencil, Trash2, Check, Eye } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { cn, calcYearLevel, pluralize } from '@/lib/utils'
import { useAcademicYear } from '@/hooks/use-academic-year'
import { TypeBadge } from '@/components/post-card'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { UserAvatar } from '@/components/shared/user-avatar'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
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
  onDelete?: () => void
  isDeleting?: boolean
}

function ActionHint({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent side="top" className="w-auto px-3 py-2">
        <p className="font-mono text-[11px] uppercase tracking-wider text-foreground">{label}</p>
      </HoverCardContent>
    </HoverCard>
  )
}

export function PostHeader({ post, isOwner, onDelete, isDeleting = false }: PostHeaderProps) {
  const [copied, setCopied] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const { data: session } = authClient.useSession()
  const toggleSaved = useUIStore((s) => s.toggleSaved)
  const isGuestSaved = useUIStore((s) => s.savedPosts.some((p) => p.id === post.id))
  const queryClient = useQueryClient()

  const isSaved = session ? post.savedByCurrentUser : isGuestSaved

  const { mutate: savePost } = usePostsControllerSavePost({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getPostsControllerFindAllQueryKey() })
        queryClient.invalidateQueries({ queryKey: getPostsControllerFindOneQueryKey(post.id) })
      },
    },
  })

  const { mutate: unsavePost } = usePostsControllerUnsavePost({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getPostsControllerFindAllQueryKey() })
        queryClient.invalidateQueries({ queryKey: getPostsControllerFindOneQueryKey(post.id) })
      },
    },
  })

  function handleSave() {
    if (!session) {
      toggleSaved(post as ApiPost)
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
    navigator.clipboard.writeText(`${window.location.origin}/s/${post.shortCode}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const academicYear = useAcademicYear()
  const yearLevel =
    post.author.enrollmentYear != null && academicYear != null
      ? calcYearLevel(post.author.enrollmentYear, academicYear)
      : null

  return (
    <>
      {isOwner && onDelete && (
        <ConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          title="Delete this post?"
          description="This will remove the post and all attached files. This action cannot be undone."
          confirmLabel="Delete post"
          cancelLabel="Keep post"
          onConfirm={onDelete}
          isPending={isDeleting}
        />
      )}

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
        <Link
          href={`/users/${post.author.id}`}
          className="flex items-center gap-3 mt-4 group w-fit"
        >
          <UserAvatar name={post.author.name} image={post.author.image} size="md" />
          <div>
            <p className="text-sm font-medium text-foreground group-hover:underline">
              {post.author.name}
            </p>
            <p className="font-mono text-xs text-text-muted">
              {yearLevel != null && `Year ${yearLevel} student · `}
              {post.author.department?.name && `${post.author.department.name} · `}
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </p>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-2 justify-between mb-6">
        <div className="flex items-center gap-3 font-mono text-xs text-text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Eye className="size-3.5" strokeWidth={1.5} />
            {(post.views || 0).toLocaleString()} {pluralize(post.views || 0, 'view')}
          </span>
          {post._count.savedBy > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Bookmark className="size-3.5" strokeWidth={1.5} />
              {post._count.savedBy.toLocaleString()} {pluralize(post._count.savedBy, 'save')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ActionHint label={isSaved ? 'Unsave Post' : 'Save Post'}>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleSave}
              aria-label={isSaved ? 'Unsave post' : 'Save post'}
            >
              <Bookmark
                className={cn('size-4', isSaved ? 'fill-amber text-amber' : 'text-text-muted')}
                strokeWidth={1.5}
              />
            </Button>
          </ActionHint>

          <ActionHint label={copied ? 'Copied' : 'Copy Share Code'}>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleShare}
              aria-label={copied ? 'Copied!' : 'Copy share code'}
            >
              {copied ? (
                <Check className="size-4 text-success" strokeWidth={1.5} />
              ) : (
                <Link2 className="size-4 text-text-muted" strokeWidth={1.5} />
              )}
            </Button>
          </ActionHint>
          {isOwner && (
            <>
              <ActionHint label="Edit Post">
                <Button variant="ghost" size="icon-sm" aria-label="Edit" asChild>
                  <Link href={`/posts/${post.id}/edit`}>
                    <Pencil className="size-4 text-text-muted" strokeWidth={1.5} />
                  </Link>
                </Button>
              </ActionHint>
              <ActionHint label="Delete Post">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isDeleting}
                  aria-label="Delete"
                >
                  <Trash2 className="size-4 text-text-muted" strokeWidth={1.5} />
                </Button>
              </ActionHint>
            </>
          )}
        </div>
      </div>

      <div className="border-t border-border" />
    </>
  )
}
