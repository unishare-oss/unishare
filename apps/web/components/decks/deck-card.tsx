'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertCircle, Download, FileText, Loader2, Presentation, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DeckStatusNote } from '@/components/decks/deck-status-note'
import { DeckDeleteDialog } from '@/components/decks/deck-delete-dialog'
import { deckWaitState, hasRenderedFiles, isRerenderFailure } from '@/lib/decks/waiting-state'
import { decksControllerGetDownloadUrl } from '@/src/lib/api/generated/decks/decks'
import type { DeckEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

/**
 * Presentational. The library polls once for the whole list, so a card never owns a request
 * of its own — thirty cards used to mean thirty status polls and a local mirror of the deck
 * that could disagree with the list it was rendered from.
 */
export function DeckCard({ deck }: { deck: DeckEntity }) {
  const [downloading, setDownloading] = useState(false)
  const wait = deckWaitState(deck)
  const ready = deck.status === 'READY'
  // A failed re-render still leaves the previous PowerPoint downloadable, so the download
  // stays on the card even though the deck's status reads FAILED.
  const downloadable = hasRenderedFiles(deck)

  async function handleDownload() {
    setDownloading(true)
    try {
      const res = await decksControllerGetDownloadUrl(deck.id, { format: 'pptx' })
      window.open(res.data.url, '_blank', 'noopener,noreferrer')
    } catch {
      toast.error('Could not get a download link. Try again in a moment.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <article className="card-pop card-pop-hover rounded-xl bg-card flex flex-col overflow-hidden">
      <Link
        href={`/decks/${deck.id}`}
        className="flex items-start gap-4 p-4 group hover:bg-accent flex-1 transition-colors motion-reduce:transition-none"
      >
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Presentation className="w-5 h-5 text-primary" strokeWidth={1.5} aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="space-y-1">
            <p className="font-semibold text-sm leading-snug line-clamp-2">
              {deck.title ?? deck.prompt}
            </p>
            <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
              {formatDistanceToNow(new Date(deck.createdAt), { addSuffix: true })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Badge variant="outline" className="text-xs font-mono font-normal">
              {deck.template}
            </Badge>
            <Badge variant="secondary" className="text-xs font-normal">
              {deck.slideCount} slides
            </Badge>
          </div>

          {wait && <DeckStatusNote state={wait} />}

          {ready && (
            <p className="flex items-center gap-1.5 text-xs text-text-muted">
              <FileText className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
              Ready — open to edit or download
            </p>
          )}

          {deck.status === 'FAILED' && (
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs line-clamp-2">
                {isRerenderFailure(deck)
                  ? 'The last re-render failed — the previous version is still downloadable.'
                  : (deck.error ?? 'Generation failed after every attempt.')}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </Link>

      {/* Always rendered now: delete has to reach a queued or failed deck too, and those are
          exactly the ones a student most wants rid of. */}
      <div className="border-t border-border px-4 py-2.5 flex items-center justify-between gap-2">
        <DeckDeleteDialog deck={deck}>
          <Button
            variant="ghost"
            size="sm"
            className="text-text-muted hover:text-destructive"
            aria-label={`Delete ${deck.title ?? 'this deck'}`}
          >
            <Trash2 className="size-3.5 mr-1.5" strokeWidth={1.5} aria-hidden="true" />
            Delete
          </Button>
        </DeckDeleteDialog>

        {downloadable && (
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading}>
            {downloading ? (
              <Loader2 className="size-3.5 mr-1.5 animate-spin" strokeWidth={1.5} />
            ) : (
              <Download className="size-3.5 mr-1.5" strokeWidth={1.5} aria-hidden="true" />
            )}
            PowerPoint
          </Button>
        )}
      </div>
    </article>
  )
}
