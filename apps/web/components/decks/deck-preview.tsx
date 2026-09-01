'use client'

import { useEffect, useState } from 'react'
import { FileWarning, Loader2 } from 'lucide-react'
import { decksControllerGetDownloadUrl } from '@/src/lib/api/generated/decks/decks'

/**
 * The rendered deck, as a PDF.
 *
 * A PDF rather than re-rendering slides in our own components: the layouts are React
 * components inside the generator's app, so anything we drew ourselves would be an
 * approximation that drifts. The PDF is what the student actually downloads.
 */
export function DeckPreview({ deckId, version }: { deckId: string; version: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setUrl(null)
    setFailed(false)

    decksControllerGetDownloadUrl(deckId, { format: 'pdf' })
      .then((res) => {
        if (!cancelled) setUrl(res.data.url)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
    }
    // `version` changes after a re-export so the presigned URL is fetched again rather than
    // showing the previous render.
  }, [deckId, version])

  if (failed) {
    return (
      <div className="flex h-full min-h-64 flex-col items-center justify-center gap-2 rounded-lg border border-border bg-muted/20 p-6 text-center">
        <FileWarning className="size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No preview for this deck. You can still download the PowerPoint file.
        </p>
      </div>
    )
  }

  if (!url) {
    return (
      <div className="flex h-full min-h-64 items-center justify-center rounded-lg border border-border bg-muted/20">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <object
      data={url}
      type="application/pdf"
      className="h-full min-h-[32rem] w-full rounded-lg border border-border"
    >
      <div className="p-6 text-center text-sm text-muted-foreground">
        Your browser cannot display PDFs inline.{' '}
        <a href={url} target="_blank" rel="noopener noreferrer" className="underline">
          Open the preview
        </a>
      </div>
    </object>
  )
}
