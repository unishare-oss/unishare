'use client'

import { useState } from 'react'
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { PostEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

interface PostSummaryProps {
  post: PostEntity
}

export function PostSummary({ post }: PostSummaryProps) {
  const [open, setOpen] = useState(true)

  if (!post.summary) return null

  const lines = post.summary
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const intro = lines.find((l) => !l.startsWith('•'))
  const bullets = lines.filter((l) => l.startsWith('•')).map((l) => l.slice(1).trim())

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 mt-4">
        <CollapsibleTrigger className="flex items-center justify-between w-full group">
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-amber" strokeWidth={1.5} />
            <span className="font-mono text-[11px] font-medium text-amber uppercase tracking-wide">
              AI Summary
            </span>
          </div>
          {open ? (
            <ChevronUp
              className="size-3.5 text-text-muted group-hover:text-foreground transition-colors"
              strokeWidth={1.5}
            />
          ) : (
            <ChevronDown
              className="size-3.5 text-text-muted group-hover:text-foreground transition-colors"
              strokeWidth={1.5}
            />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          {intro && <p className="text-sm text-text-muted leading-relaxed">{intro}</p>}
          {bullets.length > 0 && (
            <ul className="mt-2 space-y-1">
              {bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-text-muted">
                  <span className="mt-1.5 size-1.5 rounded-full bg-amber/60 shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
