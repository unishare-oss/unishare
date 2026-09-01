'use client'

import { useEffect, useState } from 'react'
import { Download, FileText, Loader2, TriangleAlert, Users } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import {
  decksControllerGetDownloadUrl,
  useDecksControllerGetDeck,
} from '@/src/lib/api/generated/decks/decks'
import type { DeckEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

const POLL_MS = 4000

function isPending(status: DeckEntity['status']) {
  return status === 'QUEUED' || status === 'GENERATING'
}

/** A range, never a countdown. A precise estimate that drifts reads worse than a vague one. */
function formatEta(seconds: number | null | undefined): string | null {
  if (!seconds || seconds <= 0) return null
  const low = Math.max(1, Math.round((seconds * 0.8) / 60))
  const high = Math.max(low + 1, Math.round((seconds * 1.3) / 60))
  return `about ${low}-${high} min`
}

export function DeckCard({ deck: initial }: { deck: DeckEntity }) {
  const [deck, setDeck] = useState(initial)
  const [downloading, setDownloading] = useState(false)

  // Polls only while the deck is actually moving; `enabled` going false is what stops it.
  const { data } = useDecksControllerGetDeck(deck.id, {
    query: {
      select: (r) => r.data,
      enabled: isPending(deck.status),
      refetchInterval: POLL_MS,
    },
  })

  useEffect(() => {
    if (data) setDeck(data)
  }, [data])

  async function handleDownload() {
    setDownloading(true)
    try {
      const res = await decksControllerGetDownloadUrl(deck.id)
      window.open(res.data.url, '_blank', 'noopener,noreferrer')
    } catch {
      toast.error('Could not get a download link. Try again in a moment.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">{deck.title ?? deck.prompt}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {deck.slideCount} slides · {formatDistanceToNow(new Date(deck.createdAt))} ago
          </p>
        </div>

        {deck.status === 'READY' && (
          <Button size="sm" onClick={handleDownload} disabled={downloading}>
            {downloading ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Download className="mr-2 size-4" />
            )}
            Download
          </Button>
        )}
      </div>

      <div className="mt-3 text-sm">
        {deck.status === 'QUEUED' && <QueuedState deck={deck} />}

        {deck.status === 'GENERATING' && (
          <span className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Generating slides — this usually takes a couple of minutes
          </span>
        )}

        {deck.status === 'READY' && (
          <span className="flex items-center gap-2 text-muted-foreground">
            <FileText className="size-4" />
            Ready to download
          </span>
        )}

        {deck.status === 'FAILED' && (
          <span className="flex items-start gap-2 text-destructive">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>{deck.error ?? 'Generation failed'}</span>
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * Position while waiting, phase once running. Showing "0 ahead of you" for two minutes looks
 * stuck, so a job with nothing ahead of it reports that it is starting instead.
 */
function QueuedState({ deck }: { deck: DeckEntity }) {
  const ahead = deck.queueAhead ?? 0
  const eta = formatEta(deck.etaSeconds)

  if (ahead === 0) {
    return (
      <span className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Starting shortly
      </span>
    )
  }

  return (
    <span className="flex items-center gap-2 text-muted-foreground">
      <Users className="size-4" />
      {deck.queueAheadIsApproximate ? `More than ${ahead}` : ahead} {ahead === 1 ? 'deck' : 'decks'}{' '}
      ahead of yours{eta ? ` · ${eta}` : ''}
    </span>
  )
}
