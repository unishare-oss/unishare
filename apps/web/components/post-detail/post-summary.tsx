'use client'

import { useState } from 'react'
import { Sparkles, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  usePostsControllerSummarize,
  getPostsControllerFindOneQueryKey,
  usePostsControllerFindOne,
} from '@/src/lib/api/generated/posts/posts'
import type { PostDetailEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

interface PostSummaryProps {
  post: PostDetailEntity
  isOwner: boolean
}

export function PostSummary({ post, isOwner }: PostSummaryProps) {
  const [open, setOpen] = useState(true)
  const queryClient = useQueryClient()

  const hasSupportedFile = post.files?.some((f) => SUPPORTED_MIME_TYPES.includes(f.mimeType))

  // Poll every 3s while post has a supported file but no summary yet
  usePostsControllerFindOne(post.id, {
    query: {
      enabled: !!hasSupportedFile && !post.summary,
      refetchInterval: 3000,
      refetchIntervalInBackground: false,
      select: (r) => r.data,
    },
  })

  const { mutate: triggerSummarize, isPending: isRegenerating } = usePostsControllerSummarize({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getPostsControllerFindOneQueryKey(post.id) })
      },
    },
  })

  if (!hasSupportedFile) return null

  const isPending = !post.summary
  const lines =
    post.summary
      ?.split('\n')
      .map((l) => l.trim())
      .filter(Boolean) ?? []
  const intro = lines.find((l) => !l.startsWith('•'))
  const bullets = lines.filter((l) => l.startsWith('•')).map((l) => l.slice(1).trim())

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 mt-4">
        <div className="flex items-center justify-between">
          <CollapsibleTrigger className="flex items-center gap-1.5 group">
            <Sparkles className="size-3.5 text-amber" strokeWidth={1.5} />
            <span className="font-mono text-[11px] font-medium text-amber uppercase tracking-wide">
              AI Summary
            </span>
            {open ? (
              <ChevronUp
                className="size-3.5 text-text-muted group-hover:text-foreground transition-colors ml-1"
                strokeWidth={1.5}
              />
            ) : (
              <ChevronDown
                className="size-3.5 text-text-muted group-hover:text-foreground transition-colors ml-1"
                strokeWidth={1.5}
              />
            )}
          </CollapsibleTrigger>
          {isOwner && !isPending && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => triggerSummarize({ id: post.id })}
              disabled={isRegenerating}
              aria-label="Regenerate summary"
            >
              <RefreshCw
                className={`size-3.5 text-text-muted ${isRegenerating ? 'animate-spin' : ''}`}
                strokeWidth={1.5}
              />
            </Button>
          )}
        </div>

        <CollapsibleContent className="mt-2">
          {isPending ? (
            <div className="space-y-2 pt-1">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
          ) : (
            <>
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
            </>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
