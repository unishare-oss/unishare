'use client'

import Link from 'next/link'
import { Bookmark, FileText, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UserAvatar } from '@/components/shared/user-avatar'
import { useUIStore } from '@/lib/store'
import type { Post } from '@/lib/mock-data'

export function TypeBadge({ type }: { type: Post['type'] }) {
  return (
    <span
      className={cn(
        'font-mono text-[11px] uppercase tracking-wider px-2 py-0.5 border rounded-[4px]',
        type === 'NOTE' ? 'border-info text-info' : 'border-amber text-amber',
      )}
    >
      {type}
    </span>
  )
}

export function PostCard({ post }: { post: Post }) {
  const isRead = useUIStore((s) => s.readPostIds.includes(post.id))
  const isSaved = useUIStore((s) => s.savedPostIds.includes(post.id))
  const toggleSaved = useUIStore((s) => s.toggleSaved)
  const markRead = useUIStore((s) => s.markRead)

  return (
    <Link href={`/posts/${post.id}`} className="block" onClick={() => markRead(post.id)}>
      <article className="relative flex items-start justify-between px-6 py-5 border-b border-border hover:bg-muted transition-colors duration-150 cursor-pointer">
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 mb-1.5">
            <TypeBadge type={post.type} />
            <span className="font-mono text-[13px] text-amber font-medium">{post.courseCode}</span>
            <span className="text-text-muted text-[13px]">{'·'}</span>
            <span className="text-text-muted text-[13px]">{post.department}</span>
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
            <UserAvatar name={post.author.name} size="xs" className="shrink-0" />
            <span className="font-mono text-xs text-foreground">{post.author.name}</span>
            <span className="text-text-muted text-xs">{'·'}</span>
            <span className="font-mono text-xs text-text-muted">Year {post.yearLevel}</span>
            <span className="text-text-muted text-xs">{'·'}</span>
            <FileText className="size-3.5 text-text-muted" strokeWidth={1.5} />
            <span className="font-mono text-xs text-text-muted">
              {post.fileCount} {post.fileCount === 1 ? 'file' : 'files'}
            </span>
            <span className="text-text-muted text-xs">{'·'}</span>
            <MessageSquare className="size-3.5 text-text-muted" strokeWidth={1.5} />
            <span className="font-mono text-xs text-text-muted">{post.commentCount} comments</span>
            <span className="text-text-muted text-xs">{'·'}</span>
            <span className="font-mono text-xs text-text-muted">{post.createdAt}</span>
          </div>
        </div>
        <button
          className="p-2 rounded-[6px] hover:bg-background transition-colors duration-150 shrink-0 mt-1"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            toggleSaved(post.id)
          }}
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
