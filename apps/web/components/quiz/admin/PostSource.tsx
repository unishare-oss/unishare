'use client'

import { useMemo, useState } from 'react'
import { BookOpen, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePostsControllerFindAll } from '@/src/lib/api/generated/posts/posts'

interface PostSourceProps {
  selectedPostId: string
  selectedPostLabel: string
  onSelect: (id: string, label: string) => void
  onClear: () => void
  disabled: boolean
}

export function PostSource({
  selectedPostId,
  selectedPostLabel,
  onSelect,
  onClear,
  disabled,
}: PostSourceProps) {
  const [postSearch, setPostSearch] = useState('')

  const { data: postsData } = usePostsControllerFindAll(
    { hasSummary: true, limit: 50 },
    { query: { select: (r) => r.data } },
  )

  const postOptions = useMemo(() => {
    const posts = postsData?.items ?? []
    const q = postSearch.toLowerCase()
    return posts
      .filter(
        (p) =>
          !q ||
          p.title?.toLowerCase().includes(q) ||
          p.course?.code?.toLowerCase().includes(q) ||
          p.course?.name?.toLowerCase().includes(q),
      )
      .map((p) => ({
        value: p.id,
        label: p.title
          ? `${p.course?.code ?? ''} — ${p.title}`
          : `${p.course?.code ?? ''} — ${p.course?.name ?? 'Untitled'}`,
      }))
  }, [postsData, postSearch])

  return (
    <section>
      <h2 className="text-[22px] font-semibold text-foreground mb-1">Select a post</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Only posts with an AI summary are shown. The course is inherited from the post.
      </p>

      <div className="space-y-3">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
            strokeWidth={1.5}
          />
          <input
            type="text"
            value={postSearch}
            onChange={(e) => setPostSearch(e.target.value)}
            placeholder="Search by title or course code…"
            disabled={disabled}
            className="w-full pl-9 pr-4 py-2 text-sm bg-muted border border-border rounded-[6px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber/50 disabled:opacity-50"
          />
        </div>

        <div className="max-h-64 overflow-y-auto rounded-[6px] border border-border divide-y divide-border">
          {postOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {postSearch ? 'No matching posts found' : 'No posts with summaries yet'}
            </p>
          ) : (
            postOptions.map((p) => (
              <button
                key={p.value}
                onClick={() => onSelect(p.value, p.label)}
                disabled={disabled}
                className={cn(
                  'w-full text-left px-4 py-3 text-sm transition-colors',
                  selectedPostId === p.value
                    ? 'bg-amber/10 text-amber'
                    : 'text-foreground hover:bg-muted',
                )}
              >
                {p.label}
              </button>
            ))
          )}
        </div>

        {selectedPostId && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <BookOpen className="size-3.5 text-amber" strokeWidth={1.5} />
            <span className="truncate">
              Selected: <span className="text-foreground">{selectedPostLabel}</span>
            </span>
            <button
              onClick={onClear}
              className="ml-auto shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
