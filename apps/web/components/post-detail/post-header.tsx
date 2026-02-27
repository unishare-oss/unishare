'use client'

import { Bookmark, Link2, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TypeBadge } from '@/components/post-card'
import { UserAvatar } from '@/components/shared/user-avatar'
import { useUIStore } from '@/lib/store'
import type { Post } from '@/lib/mock-data'

interface PostHeaderProps {
  post: Post
  isOwner: boolean
}

export function PostHeader({ post, isOwner }: PostHeaderProps) {
  const isSaved = useUIStore((s) => s.savedPostIds.includes(post.id))
  const toggleSaved = useUIStore((s) => s.toggleSaved)

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
          <span className="font-mono text-[13px] text-amber font-medium">{post.courseCode}</span>
        </div>
        <h1 className="text-[28px] font-semibold text-foreground tracking-tight leading-tight mt-2 text-balance">
          {post.title}
        </h1>
        <div className="flex items-center gap-1.5 mt-3 font-mono text-xs text-text-muted flex-wrap">
          <span>Year {post.yearLevel}</span>
          <span>{'·'}</span>
          <span>Semester {post.semester}</span>
          {post.module && (
            <>
              <span>{'·'}</span>
              <span>Module {post.module}</span>
            </>
          )}
          {post.examYear && (
            <>
              <span>{'·'}</span>
              <span>{post.examYear} Exam</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3 mt-4">
          <UserAvatar name={post.author.name} size="md" />
          <div>
            <p className="text-sm font-medium text-foreground">{post.author.name}</p>
            <p className="font-mono text-xs text-text-muted">
              Year {post.author.yearLevel} student {'·'} {post.author.department} {'·'}{' '}
              {post.createdAt}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 justify-end mb-6">
        <button
          className="p-2 rounded-[6px] hover:bg-muted transition-colors duration-150"
          aria-label={isSaved ? 'Unsave post' : 'Save post'}
          onClick={() => toggleSaved(post.id)}
        >
          <Bookmark
            className={cn('size-4', isSaved ? 'fill-amber text-amber' : 'text-text-muted')}
            strokeWidth={1.5}
          />
        </button>
        <button
          className="p-2 rounded-[6px] hover:bg-muted transition-colors duration-150"
          aria-label="Copy link"
        >
          <Link2 className="size-4 text-text-muted" strokeWidth={1.5} />
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
