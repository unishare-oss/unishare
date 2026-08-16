'use client'

import { useRef, useState, useEffect, KeyboardEvent } from 'react'
import { Bot, ChevronDown, Send, AlertCircle, Loader2 } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { Collapsible, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { usePostAiChat, type AiChatCitation } from '@/hooks/use-post-ai-chat'
import { useAiIndexStatus } from '@/hooks/use-ai-index-status'
import type { PostDetailEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

// Mirrors SUPPORTED_MIME_TYPES in apps/api/src/modules/ai/extraction/document-extractor.service.ts,
// which is the source of truth. Keep the two in step.
const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

/**
 * Built as a single string rather than JSX text interleaved with `{' '}` expressions.
 *
 * The interleaved form rendered as "sectionsso far" in the browser while the component test
 * passed, because the space before "so far" was a JSX text node sitting directly after an
 * expression container, and the test transform and the Next build do not treat that whitespace
 * identically. One string has no whitespace for a transform to disagree about.
 *
 * Deliberately no percentage or ratio: the total chunk count is unknown until chunking finishes,
 * so any denominator would be invented.
 */
function preparingMessage(indexedChunks: number): string {
  const label = indexedChunks === 1 ? 'section' : 'sections'
  return (
    `Preparing this document for AI chat — indexed ${indexedChunks} ${label} so far. ` +
    `You can ask questions now, but answers won't cite page numbers until this finishes.`
  )
}

/**
 * Built as one string for the same whitespace reason as `preparingMessage` above.
 *
 * `reason` says why no page chips are shown, and the two reasons are genuinely different: a .docx
 * has no pages to show, whereas a multi-file post has pages that cannot be attributed. Collapsing
 * them into one sentence would tell a student with two PDFs that their PDFs have no page numbers.
 */
function excerptLabel(count: number, reason: string): string {
  return `${count} ${count === 1 ? 'excerpt' : 'excerpts'} · ${reason}`
}

/**
 * `getAiIndexStatus` settles on `'ready'` as soon as ONE supported file is READY, and retrieval
 * filters to READY files — so a post whose past paper indexed and whose solutions file failed
 * answers and cites from half of itself, with full confidence and no caveat anywhere. The status
 * DTO has carried `readyFiles`/`supportedFiles` all along; this is the notice that reads them.
 *
 * One string, for the whitespace reason documented on `preparingMessage`.
 */
function missingDocumentsMessage(readyFiles: number, supportedFiles: number): string {
  const missing = supportedFiles - readyFiles
  return (
    `${missing} of ${supportedFiles} documents couldn't be prepared for AI chat — ` +
    `answers won't cover ${missing === 1 ? 'it' : 'them'}.`
  )
}

/**
 * The excerpts retrieval put in front of the model — every one of them, not the subset the model
 * actually leaned on, which the server has no way to know.
 *
 * So this is deliberately framed as "Sources consulted" and rendered as a footer under the whole
 * message rather than inline with any sentence. Nothing here may read as "this claim came from
 * page 12": the model can and does reply "these excerpts do not cover X" with citations still
 * attached, and under this framing that reads correctly — here is what was searched, and it
 * didn't contain the answer.
 *
 * Pages are de-duplicated because the top chunks frequently share a page. Chunks with no page
 * (`.docx` has no pagination) are counted instead of being given an invented page label, and
 * snippets are not rendered at all: capped at 160 chars and often starting mid-sentence, they
 * would masquerade as quotations of record.
 *
 * `multiFile` suppresses page chips entirely, and that is a correctness requirement rather than a
 * style choice. `pageNum` restarts at 1 in every file (`@@unique([fileId, chunkIndex])`) and a
 * citation carries no file identity, so on a two-PDF post — "past paper plus solutions" is an
 * ordinary shape here — a chunk from page 3 of one file and a chunk from page 3 of the other
 * de-duplicate into a single `p. 3` chip that points at the wrong document half the time. A page
 * number a student cannot resolve to a document is worse than no page number at all, because they
 * will act on it. The honest fix is to carry `fileId` through the citation DTO and label each chip
 * with its file; until that lands, suppress.
 */
function CitationFooter({
  citations,
  multiFile,
}: {
  citations: AiChatCitation[]
  multiFile: boolean
}) {
  const pages = multiFile
    ? []
    : [...new Set(citations.map((c) => c.pageNum).filter((p) => p !== null))].sort((a, b) => a - b)

  return (
    <div
      role="note"
      className="flex flex-wrap items-center gap-1 border-t border-border/60 pt-1.5 mt-0.5"
    >
      {/* Deliberately no `title` tooltip: it is invisible on touch, unreachable by keyboard and
          announced inconsistently, so it cannot be the thing that makes this block honest. The
          visible label has to carry that on its own. */}
      <span className="font-mono text-[10px] uppercase tracking-wide text-text-muted">
        Sources consulted
      </span>
      {pages.length > 0 ? (
        pages.map((page) => (
          <span
            key={page}
            className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-border text-text-muted"
          >
            {`p. ${page}`}
          </span>
        ))
      ) : (
        <span className="font-mono text-[10px] text-text-muted">
          {excerptLabel(
            citations.length,
            multiFile ? 'from multiple documents' : 'no page numbers',
          )}
        </span>
      )}
    </div>
  )
}

interface PostAiChatProps {
  post: PostDetailEntity
}

export function PostAiChat({ post }: PostAiChatProps) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Counted from the post's own files rather than from `indexStatus.supportedFiles`, so the
  // ambiguity check is settled before the status request resolves — citations can render on the
  // very first answer, and a chip that appears unlabelled for one render and then corrects itself
  // is the same wrong claim, just briefly. Only indexable files count: a PDF sitting next to a
  // screenshot has exactly one source of page numbers, so its pages are unambiguous.
  const supportedFiles = post.files?.filter((f) => SUPPORTED_MIME_TYPES.includes(f.mimeType)) ?? []
  const hasSupportedFiles = supportedFiles.length > 0
  const hasMultipleDocuments = supportedFiles.length > 1

  const { messages, sendMessage, isPending } = usePostAiChat(post.id)
  const { status: indexStatus } = useAiIndexStatus(post.id, hasSupportedFiles)

  const isPreparing = indexStatus?.state === 'preparing'
  const indexFailed = indexStatus?.state === 'failed'
  // Deliberately scoped to 'ready'. While indexing is in flight `readyFiles < supportedFiles` is
  // the ordinary condition, not a failure, and the preparing notice already covers it; in the
  // 'failed' state the existing notice already says nothing could be prepared.
  const someDocumentsMissing =
    indexStatus?.state === 'ready' && indexStatus.readyFiles < indexStatus.supportedFiles

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
                    Ask a question about this document. This conversation isn&apos;t saved — it
                    clears when you leave the page.
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
                                ? 'bg-muted border border-border text-text-muted'
                                : 'bg-muted border border-border',
                          )}
                        >
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-start gap-1.5">
                              {msg.offTopic && (
                                <AlertCircle className="size-3.5 shrink-0 mt-0.5 text-amber" />
                              )}
                              <span>{msg.content}</span>
                            </div>
                            {msg.citations && msg.citations.length > 0 && (
                              <CitationFooter
                                citations={msg.citations}
                                multiFile={hasMultipleDocuments}
                              />
                            )}
                          </div>
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
                  <div
                    role="status"
                    aria-live="polite"
                    className="flex items-start gap-2 rounded-md border border-border bg-muted px-3 py-2 text-xs leading-relaxed text-text-muted"
                  >
                    <Loader2
                      className="size-3.5 shrink-0 mt-0.5 animate-spin"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                    <span>{preparingMessage(indexStatus?.indexedChunks ?? 0)}</span>
                  </div>
                )}

                {indexFailed && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="flex items-start gap-2 rounded-md border border-border bg-muted px-3 py-2 text-xs leading-relaxed text-text-muted"
                  >
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

                {someDocumentsMissing && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="flex items-start gap-2 rounded-md border border-border bg-muted px-3 py-2 text-xs leading-relaxed text-text-muted"
                  >
                    <AlertCircle
                      className="size-3.5 shrink-0 mt-0.5 text-amber"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                    <span>
                      {missingDocumentsMessage(
                        indexStatus?.readyFiles ?? 0,
                        indexStatus?.supportedFiles ?? 0,
                      )}
                    </span>
                  </div>
                )}

                {/* Sits outside the scrolling message list on purpose, so the reminder that
                    nothing is persisted stays visible instead of scrolling away with history. */}
                {messages.length > 0 && (
                  <p className="font-mono text-[10px] text-text-muted uppercase tracking-wide">
                    Not saved
                  </p>
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
