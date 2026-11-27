'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'

const CONFIRM_MS = 1500

/**
 * Copies an AI reply's text, which is its markdown source, so a formula or table pasted into notes
 * keeps its structure.
 *
 * The clipboard is not always there: it needs a secure context and, in some browsers, a user
 * permission. A refused copy leaves the button as it was rather than claiming success.
 */
export function CopyReplyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      return
    }
    setCopied(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), CONFIRM_MS)
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? 'Copied' : 'Copy reply'}
      className="inline-flex items-center gap-1 rounded px-1 py-0.5 font-mono text-[10px] uppercase tracking-wide text-text-muted transition-colors hover:text-foreground"
    >
      {copied ? (
        <Check className="size-3" strokeWidth={1.5} aria-hidden="true" />
      ) : (
        <Copy className="size-3" strokeWidth={1.5} aria-hidden="true" />
      )}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}
