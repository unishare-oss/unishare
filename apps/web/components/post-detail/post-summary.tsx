'use client'

import { useState } from 'react'
import { Sparkles, ChevronDown, RefreshCw } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import { Collapsible, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import {
  usePostsControllerSummarize,
  getPostsControllerFindOneQueryKey,
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

  const { mutate: triggerSummarize, isPending: isRegenerating } = usePostsControllerSummarize({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getPostsControllerFindOneQueryKey(post.id) })
      },
    },
  })

  if (!hasSupportedFile || !post.summary) return null

  const lines = post.summary
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const intro = lines.find((l) => !l.startsWith('•'))
  const bullets = lines.filter((l) => l.startsWith('•')).map((l) => l.slice(1).trim())

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border border-border bg-muted/40 mt-4 overflow-hidden">
        {/* Header */}
        <div className="group/header flex items-center justify-between px-4 py-3">
          <CollapsibleTrigger className="flex items-center gap-1.5 group cursor-pointer flex-1 text-left">
            <Sparkles className="size-3.5 text-amber" strokeWidth={1.5} />
            <span className="font-mono text-[11px] font-medium text-amber uppercase tracking-wide">
              AI Summary
            </span>
            <motion.span
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="ml-1 flex"
            >
              <ChevronDown
                className="size-3.5 text-text-muted group-hover:text-foreground transition-colors"
                strokeWidth={1.5}
              />
            </motion.span>
          </CollapsibleTrigger>

          {isOwner && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => triggerSummarize({ id: post.id })}
              disabled={isRegenerating}
              aria-label="Regenerate summary"
              className={`transition-opacity ${isRegenerating ? 'opacity-100' : 'opacity-0 group-hover/header:opacity-100'}`}
            >
              <RefreshCw
                className={`size-3.5 text-text-muted ${isRegenerating ? 'animate-spin' : ''}`}
                strokeWidth={1.5}
              />
            </Button>
          )}
        </div>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="summary-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: 'easeInOut' }}
              style={{ overflow: 'hidden' }}
            >
              <div className="px-4 pb-3">
                {intro && (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.05 }}
                    className="text-sm text-text-muted leading-relaxed"
                  >
                    {intro}
                  </motion.p>
                )}
                {bullets.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {bullets.map((b, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: 0.08 + i * 0.06 }}
                        className="flex items-start gap-2 text-sm text-text-muted"
                      >
                        <span className="mt-1.5 size-1.5 rounded-full bg-amber/60 shrink-0" />
                        {b}
                      </motion.li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Collapsible>
  )
}
