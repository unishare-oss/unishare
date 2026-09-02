'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertCircle, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * The slide editor, running in its own origin.
 *
 * Unishare no longer edits slides itself. A slide has two representations in the generator —
 * a semantic `content` object and a `ui` render tree — and only the render tree reaches the
 * PowerPoint export, which is why the form editor this replaced saved without ever changing
 * the deck. The generator's own editor writes both, so editing lives there.
 *
 * Authorization is not this component's job and cannot be: the frame is cross-origin. Every
 * request it makes passes through a proxy that checks the Better Auth session, attaches the
 * student's generator session upstream, blocks the generator's admin and deck-creation routes,
 * and meters its AI calls against a daily cap.
 */

/**
 * How long to wait before assuming the frame is not coming.
 *
 * Generous because a first load compiles and ships a whole other application; a student on a
 * slow connection should see a skeleton, not an error they cannot act on.
 */
const LOAD_TIMEOUT_MS = 30_000

interface DeckEditorFrameProps {
  /** Finished URL from the deck, built server-side. Never composed here. */
  url: string
  title: string
}

export function DeckEditorFrame({ url, title }: DeckEditorFrameProps) {
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    timer.current = setTimeout(() => {
      // `onLoad` never fired. Cross-origin means there is no way to ask why, so this is a
      // timeout rather than a diagnosis.
      setState((current) => (current === 'loading' ? 'failed' : current))
    }, LOAD_TIMEOUT_MS)

    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [url])

  function settle(next: 'ready' | 'failed') {
    if (timer.current) clearTimeout(timer.current)
    setState(next)
  }

  if (state === 'failed') {
    return (
      <div className="card-pop rounded-xl bg-card flex min-h-80 flex-col items-center justify-center gap-3 p-6 text-center">
        <AlertCircle className="size-6 text-text-muted" strokeWidth={1.5} aria-hidden="true" />
        <p className="text-sm text-text-muted text-balance max-w-md">
          The slide editor could not be opened. Your deck is safe and both downloads still work —
          this is the editor itself failing to load.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setState('loading')}>
            Try again
          </Button>
          {/* An escape hatch rather than a dead end: the editor works in its own tab even when
              it will not frame, and it is the same authenticated route either way. */}
          <Button variant="ghost" size="sm" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3.5 mr-1.5" strokeWidth={1.5} aria-hidden="true" />
              Open in a new tab
            </a>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-[70vh] rounded-xl border border-border overflow-hidden bg-card">
      {state === 'loading' && (
        <Skeleton className="absolute inset-0 rounded-none" aria-label="Loading the slide editor" />
      )}
      <iframe
        // Remounts on retry, so "Try again" actually reloads rather than reusing a dead frame.
        key={state === 'loading' ? `${url}-retry` : url}
        src={url}
        title={`Editing ${title}`}
        onLoad={() => settle('ready')}
        onError={() => settle('failed')}
        className="w-full min-h-[70vh] h-full border-0 block"
        // Same-site but a separate origin, so it needs its own permissions. No allow-downloads:
        // exports come back through Unishare's own presigned URLs.
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        allow="clipboard-write"
      />
    </div>
  )
}
