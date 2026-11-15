'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import type { PostDetailEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

interface PostSummaryProps {
  post: PostDetailEntity
}

/** Past this many lines the summary starts collapsed behind a "Show more" link. */
const COLLAPSED_LINES = 4

export function PostSummary({ post }: PostSummaryProps) {
  const [expanded, setExpanded] = useState(false)

  if (!post.summary) return null

  const lines = post.summary
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const isLong = lines.length > COLLAPSED_LINES
  const shown = isLong && !expanded ? lines.slice(0, COLLAPSED_LINES) : lines
  const intro = shown.filter((l) => !l.startsWith('•'))
  const bullets = shown.filter((l) => l.startsWith('•')).map((l) => l.slice(1).trim())

  return (
    <section
      aria-label="AI summary"
      className="mb-[22px] grid max-w-[66ch] gap-1.5 rounded-[var(--r-s)] bg-surface-2 px-4 py-3.5 font-body"
    >
      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
        <Sparkles className="size-3.5 text-sky" strokeWidth={2} aria-hidden="true" />
        AI summary
      </span>
      {intro.map((line, i) => (
        <p key={i} className="m-0 text-[14.5px] leading-[1.6] text-ink">
          {line}
        </p>
      ))}
      {bullets.length > 0 && (
        <ul className="m-0 grid list-disc gap-1 pl-5 text-[14.5px] leading-[1.6] text-ink">
          {bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="justify-self-start text-[13px] font-medium text-sky hover:underline"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </section>
  )
}
