'use client'

import { ExternalLink, FileWarning, Loader2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getDecksControllerGetDownloadUrlQueryKey,
  useDecksControllerGetDownloadUrl,
} from '@/src/lib/api/generated/decks/decks'

/** The presigned URL is good for an hour; refetching well before that avoids a dead frame. */
const URL_STALE_MS = 30 * 60 * 1000

/**
 * Stands in for the preview when there is no PDF to show — either the deck predates PDF
 * rendering, or that half of the export failed while the PowerPoint succeeded.
 */
export function DeckPreviewUnavailable() {
  return (
    <div className="card-pop rounded-xl bg-card flex min-h-64 flex-col items-center justify-center gap-2 p-6 text-center">
      <FileWarning className="size-6 text-text-muted" strokeWidth={1.5} aria-hidden="true" />
      <p className="text-sm text-text-muted text-balance">
        No preview was rendered for this deck. The PowerPoint download still works.
      </p>
    </div>
  )
}

/**
 * The rendered deck, as a PDF.
 *
 * A PDF rather than re-rendering slides in our own components: the layouts are React
 * components inside the generator's app, so anything we drew ourselves would be an
 * approximation that drifts. The PDF is what the student actually downloads.
 */
export function DeckPreview({ deckId, version }: { deckId: string; version: string }) {
  const { data, isLoading, isError } = useDecksControllerGetDownloadUrl(
    deckId,
    { format: 'pdf' },
    {
      query: {
        select: (r) => r.data,
        // `version` is part of the key so a re-export fetches a fresh URL instead of showing
        // the render the student just replaced.
        queryKey: [...getDecksControllerGetDownloadUrlQueryKey(deckId, { format: 'pdf' }), version],
        staleTime: URL_STALE_MS,
        retry: false,
      },
    },
  )

  if (isError) return <DeckPreviewUnavailable />

  if (isLoading || !data?.url) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="card-pop rounded-xl bg-card relative min-h-64 overflow-hidden"
      >
        <Skeleton className="absolute inset-0 rounded-none" />
        <div className="relative flex min-h-64 items-center justify-center gap-2 text-xs text-text-muted">
          <Loader2
            className="size-3.5 animate-spin motion-reduce:animate-none"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          Loading the preview
        </div>
      </div>
    )
  }

  return (
    <div className="card-pop rounded-xl bg-card overflow-hidden">
      <object
        data={data.url}
        type="application/pdf"
        aria-label="Deck preview"
        className="h-[60vh] min-h-80 w-full md:h-[calc(100vh-14rem)]"
      >
        <div className="flex flex-col items-center gap-3 p-6 text-center">
          <p className="text-sm text-text-muted text-balance">
            Your browser cannot display PDFs inline.
          </p>
          <a
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <ExternalLink className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
            Open the preview in a new tab
          </a>
        </div>
      </object>
    </div>
  )
}
