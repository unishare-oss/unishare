'use client'

import { useRef, useState, useEffect, KeyboardEvent } from 'react'
import { Bot, ChevronDown, Send, AlertCircle, Loader2 } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { Collapsible, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { usePostAiChat } from '@/hooks/use-post-ai-chat'
import { useAiIndexStatus } from '@/hooks/use-ai-index-status'
import type { PostDetailEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

interface PostAiChatProps {
  post: PostDetailEntity
}

export function PostAiChat({ post }: PostAiChatProps) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const hasSupportedFiles = post.files?.some((f) => SUPPORTED_MIME_TYPES.includes(f.mimeType))
  const { messages, sendMessage, isPending } = usePostAiChat(post.id)
  const { status: indexStatus } = useAiIndexStatus(post.id, Boolean(hasSupportedFiles))

  const isPreparing = indexStatus?.state === 'preparing'
  const indexFailed = indexStatus?.state === 'failed'

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [messages])

  if (!hasSupportedFiles) return null

  async function handleSend() {
    const text = input.trim()
    if (!text || isPending) return
    setInput('')
    await sendMessage(text)
    textareaRef.current?.focus()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="detail-box rounded-lg border border-border bg-muted/40 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <CollapsibleTrigger className="flex items-center gap-1.5 group cursor-pointer flex-1 text-left">
            <Bot className="size-3.5 text-blue" strokeWidth={1.5} />
            <span className="font-mono text-[11px] font-medium text-blue uppercase tracking-wide">
              Ask AI
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
            {isPreparing && !open && (
              <span className="ml-1.5 font-mono text-[10px] text-text-muted">Indexing…</span>
            )}
          </CollapsibleTrigger>
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="chat-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: 'easeInOut' }}
              style={{ overflow: 'hidden' }}
            >
              <div className="px-4 pb-4 flex flex-col gap-3">
                {messages.length === 0 && (
                  <p className="text-xs text-text-muted py-2">
                    Ask a question about this document.
                  </p>
                )}

                {messages.length > 0 && (
                  <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
                    {messages.map((msg, i) => (
                      <div
                        key={i}
                        className={cn(
                          'flex gap-2 text-sm',
                          msg.role === 'user' ? 'justify-end' : 'justify-start',
                        )}
                      >
                        <div
                          className={cn(
                            'rounded-lg px-3 py-2 max-w-[85%] leading-relaxed',
                            msg.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : msg.offTopic
                                ? 'bg-muted border border-border text-text-muted flex items-start gap-1.5'
                                : 'bg-muted border border-border',
                          )}
                        >
                          {msg.offTopic && (
                            <AlertCircle className="size-3.5 shrink-0 mt-0.5 text-amber" />
                          )}
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {isPending && (
                      <div className="flex justify-start">
                        <div className="bg-muted border border-border rounded-lg px-3 py-2 text-sm text-text-muted">
                          <span className="animate-pulse">Thinking…</span>
                        </div>
                      </div>
                    )}
                    <div ref={bottomRef} />
                  </div>
                )}

                {isPreparing && (
                  <div className="flex items-start gap-2 rounded-md border border-border bg-muted px-3 py-2 text-xs leading-relaxed text-text-muted">
                    <Loader2
                      className="size-3.5 shrink-0 mt-0.5 animate-spin"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                    <span>
                      Preparing this document for AI chat — indexed{' '}
                      {indexStatus?.indexedChunks ?? 0}{' '}
                      {indexStatus?.indexedChunks === 1 ? 'section' : 'sections'} so far. You can
                      ask questions now, but answers won&apos;t cite page numbers until this
                      finishes.
                    </span>
                  </div>
                )}

                {indexFailed && (
                  <div className="flex items-start gap-2 rounded-md border border-border bg-muted px-3 py-2 text-xs leading-relaxed text-text-muted">
                    <AlertCircle
                      className="size-3.5 shrink-0 mt-0.5 text-amber"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                    <span>
                      This document couldn&apos;t be prepared for AI chat. Answers will come from
                      the whole document and won&apos;t cite page numbers.
                    </span>
                  </div>
                )}

                <div className="flex gap-2 items-end">
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about this document…"
                    className="resize-none min-h-[2.5rem] max-h-32 text-sm"
                    rows={1}
                    disabled={isPending}
                    maxLength={500}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleSend}
                    disabled={!input.trim() || isPending}
                    className="shrink-0"
                  >
                    <Send className="size-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Collapsible>
  )
}
