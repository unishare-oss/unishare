'use client'

import Link from 'next/link'
import type { CSSProperties } from 'react'
import { Bookmark, FileText, Heart, MessageSquare, type LucideIcon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn, pluralize } from '@/lib/utils'
import { getPostType, sumReactions } from '@/lib/posts/post-type'
import { UserAvatar } from '@/components/shared/user-avatar'
import { useUIStore } from '@/lib/store'
import { useAuth } from '@/contexts/auth-context'
import { ReportDialog } from '@/components/ReportDialog'
import type { ApiPost } from '@/lib/api-types'

export function TypeBadge({ type }: { type: string }) {
  const { label, color } = getPostType(type)
  return (
    <span
      style={{ '--c': color } as CSSProperties}
      className="rounded-full bg-[color-mix(in_srgb,var(--c)_14%,transparent)] px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-(--c)"
    >
      {label}
    </span>
  )
}

function Count({ icon: Icon, count, noun }: { icon: LucideIcon; count: number; noun: string }) {
  return (
    <span
      aria-label={`${count} ${pluralize(count, noun)}`}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-muted-foreground tabular-nums"
    >
      <Icon aria-hidden="true" className="size-5" strokeWidth={2} />
      <span>{count}</span>
    </span>
  )
}

export function PostCard({ post }: { post: ApiPost }) {
  const isRead = useUIStore((s) => s.readPostIds.includes(post.id))
  const markRead = useUIStore((s) => s.markRead)
  const { isAuthenticated } = useAuth()

  const author = post.author
  const name = author?.name ?? 'Anonymous'
  const likes = sumReactions(post.reactionCounts)
  const when = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })
  const who = (
    <>
      <UserAvatar
        name={name}
        image={author?.image}
        size="md"
        className="size-[34px] shrink-0 rounded-full"
      />
      <span className="grid min-w-0 leading-[1.3]">
        <b className="text-sm font-semibold">{name}</b>
        <small className="text-xs [overflow-wrap:anywhere] text-muted-foreground">
          {post.course.code} · {when}
        </small>
      </span>
    </>
  )

  return (
    <article className="grid gap-3 rounded-(--r) border-2 border-line bg-surface p-4">
      <div className="flex min-w-0 items-center gap-2.5">
        {author ? (
          <Link href={`/users/${author.id}`} className="flex min-w-0 items-center gap-2.5">
            {who}
          </Link>
        ) : (
          <span className="flex min-w-0 items-center gap-2.5">{who}</span>
        )}
        <span className="ml-auto flex items-center gap-2">
          {isAuthenticated && !post.isOwner && <ReportDialog postId={post.id} />}
          <TypeBadge type={post.type} />
        </span>
      </div>
      <h3
        className={cn(
          'text-[17px] leading-[1.35] font-semibold',
          isRead && 'text-muted-foreground',
        )}
      >
        <Link
          href={`/posts/${post.id}`}
          onClick={() => markRead(post.id)}
          className="underline-offset-[3px] hover:underline"
        >
          {post.title}
        </Link>
      </h3>
      {!!post.files?.length && (
        <div className="flex items-center gap-2.5 rounded-(--r-s) bg-surface-2 px-3 py-2.5 text-[13px] text-muted-foreground">
          <FileText aria-hidden="true" className="size-5 shrink-0 text-brand-edge" />
          <span className="truncate">{post.files[0].name}</span>
          {post.files.length > 1 && <span className="shrink-0">+{post.files.length - 1} more</span>}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-1">
        <Count icon={Heart} count={likes} noun="like" />
        <Count icon={MessageSquare} count={post._count.comments} noun="comment" />
        <Count icon={Bookmark} count={post._count.savedBy} noun="save" />
      </div>
    </article>
  )
}
