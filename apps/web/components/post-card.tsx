'use client'

import Link from 'next/link'
import { useState, type CSSProperties } from 'react'
import {
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  FileText,
  Flag,
  Heart,
  Link2,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { cn, pluralize } from '@/lib/utils'
import { getPostType, sumReactions } from '@/lib/posts/post-type'
import { UserAvatar } from '@/components/shared/user-avatar'
import { useUIStore } from '@/lib/store'
import { useAuth } from '@/contexts/auth-context'
import { ReportDialog } from '@/components/ReportDialog'
import type { ApiPost } from '@/lib/api-types'
import { useToggleSavedPost } from '@/hooks/use-toggle-saved-post'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'

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
  const { isSaved, pending: savePending, toggle: toggleSaved } = useToggleSavedPost(post)
  const [reportOpen, setReportOpen] = useState(false)
  const canReport = isAuthenticated && !post.isOwner
  const href = `/posts/${post.id}`

  function copyLink() {
    // The clipboard only exists on secure pages, and reading it can throw before any promise
    // exists, so both a missing API and a refused write end in the same toast.
    const failed = () => toast.error('Could not copy the link')
    try {
      if (!navigator.clipboard) return failed()
      navigator.clipboard
        .writeText(`${window.location.origin}/s/${post.shortCode}`)
        .then(() => toast.success('Link copied'))
        .catch(failed)
    } catch {
      failed()
    }
  }

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

  const card = (
    <article
      className={cn(
        'relative grid gap-3 rounded-(--r) border-2 border-line bg-surface p-4',
        // The whole card is the link, so the whole card answers the pointer and the keyboard. It
        // rises a little and takes the soft shadow; reduced motion keeps the shadow and border only.
        'transition-[translate,box-shadow,border-color] duration-200 ease-out',
        'hover:-translate-y-0.5 hover:border-edge hover:shadow-lift',
        'has-[a:focus-visible]:-translate-y-0.5 has-[a:focus-visible]:border-edge has-[a:focus-visible]:shadow-lift',
        // A press settles the card even while the title keeps keyboard focus: `:has()` outweighs
        // `:active`, so the focus lift needs its own pressed reset.
        'active:translate-y-0 active:shadow-none',
        'has-[a:focus-visible]:active:translate-y-0 has-[a:focus-visible]:active:shadow-none',
        'motion-reduce:transition-[box-shadow,border-color] motion-reduce:hover:translate-y-0 motion-reduce:has-[a:focus-visible]:translate-y-0',
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {author ? (
          <Link
            href={`/users/${author.id}`}
            className="relative z-10 flex min-w-0 items-center gap-2.5"
          >
            {who}
          </Link>
        ) : (
          <span className="flex min-w-0 items-center gap-2.5">{who}</span>
        )}
        <span className="relative z-10 ml-auto flex items-center gap-2">
          {canReport && (
            <ReportDialog postId={post.id} open={reportOpen} onOpenChange={setReportOpen} />
          )}
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
          href={href}
          onClick={() => markRead(post.id)}
          // The ::after overlay stretches the link over the whole card; the author link and
          // report button sit above it with z-10. Focus shows on the card, not as an outline here.
          className="outline-none after:absolute after:inset-0 after:rounded-(--r) after:content-['']"
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

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{card}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuItem
          onSelect={() => {
            markRead(post.id)
            window.open(href, '_blank', 'noopener')
          }}
        >
          <ExternalLink aria-hidden="true" />
          Open in new tab
        </ContextMenuItem>
        <ContextMenuItem onSelect={copyLink}>
          <Link2 aria-hidden="true" />
          Copy link
        </ContextMenuItem>
        <ContextMenuItem onSelect={toggleSaved} disabled={savePending}>
          {isSaved ? <BookmarkCheck aria-hidden="true" /> : <Bookmark aria-hidden="true" />}
          {isSaved ? 'Remove from saved' : 'Save'}
        </ContextMenuItem>
        {canReport && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem variant="destructive" onSelect={() => setReportOpen(true)}>
              <Flag aria-hidden="true" />
              Report
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
