'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { DeckPreviewUnavailable } from '@/components/decks/deck-preview'

/**
 * The shared deck, rendered as its PDF.
 *
 * The whole point of a share link is that the recipient can SEE the deck — a page offering
 * only a download makes them take the file on faith. Same `<object type="application/pdf">`
 * as the owner's DeckPreview, for the same reason: the layouts are React components inside
 * the generator, so anything drawn here would be an approximation that drifts.
 *
 * Fetches the presigned URL itself rather than using a generated hook. This page is
 * unauthenticated and the generated fetcher exists to carry a session.
 */
export function SharedDeckPreview({ token }: { token: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const res = await fetch(`/api/decks/shared/${token}/download?format=pdf`, {
          cache: 'no-store',
        })
        if (!res.ok) throw new Error(String(res.status))
        const { data } = (await res.json()) as { data: { url: string } }
        if (!cancelled) setUrl(data.url)
      } catch {
        // A deck whose preview render failed has a working pptx and no pdf, which is what
        // DeckPreviewUnavailable is worded for.
        if (!cancelled) setFailed(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [token])

  if (failed) return <DeckPreviewUnavailable />

  if (!url) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="card-pop relative min-h-64 overflow-hidden rounded-xl bg-card"
      >
        <Skeleton className="absolute inset-0 rounded-none" />
        <div className="relative flex min-h-64 items-center justify-center gap-2 text-xs text-text-muted">
          <Loader2
            className="size-3.5 animate-spin motion-reduce:animate-none"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          Loading the deck
        </div>
      </div>
    )
  }

  return (
    <div className="card-pop overflow-hidden rounded-xl bg-card">
      <object
        data={url}
        type="application/pdf"
        aria-label="Shared deck"
        className="h-[60vh] min-h-80 w-full md:h-[calc(100vh-20rem)]"
      >
        <div className="flex flex-col items-center gap-3 p-6 text-center">
          <p className="text-sm text-balance text-text-muted">
            Your browser cannot display PDFs inline.
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <ExternalLink className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
            Open the deck in a new tab
          </a>
        </div>
      </object>
    </div>
  )
}
