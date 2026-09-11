'use client'

import { use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowLeft, Presentation, Share2, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { DeckPreview, DeckPreviewUnavailable } from '@/components/decks/deck-preview'
import { DeckStatusNote } from '@/components/decks/deck-status-note'
import { DeckDeleteDialog } from '@/components/decks/deck-delete-dialog'
import { DeckEditorFrame } from '@/components/decks/deck-editor-frame'
import { DeckTitleEditor } from '@/components/decks/deck-title-editor'
import { DeckDownloadMenu } from '@/components/decks/deck-download-menu'
import { DeckShareDialog } from '@/components/decks/deck-share-dialog'
import { deckWaitState, hasRenderedFiles, isRerenderFailure } from '@/lib/decks/waiting-state'
import { useDecksControllerGetDeck } from '@/src/lib/api/generated/decks/decks'

const POLL_MS = 4000

function DeckDetailSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-[70vh] min-h-80 w-full rounded-xl" />
    </div>
  )
}

export default function DeckDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const {
    data: deck,
    isLoading,
    isError,
  } = useDecksControllerGetDeck(id, {
    query: {
      select: (r) => r.data,
      // `select` never reaches the refetch scheduler, so this reads the raw envelope.
      refetchInterval: (query) => {
        const status = (query.state.data as { data?: { status?: string } } | undefined)?.data
          ?.status
        return status === 'QUEUED' || status === 'GENERATING' ? POLL_MS : false
      },
    },
  })

  // A re-render flips the deck back to GENERATING even though its previous files are all still
  // there — so "has something to show" is not "READY".
  const rendered = Boolean(deck && hasRenderedFiles(deck))
  const editable = Boolean(rendered && deck?.canEdit && deck?.editorUrl)

  const wait = deck ? deckWaitState(deck) : null

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title={deck?.title ?? 'Deck'}
        titleSlot={deck ? <DeckTitleEditor deck={deck} /> : undefined}
        subtitle={
          deck
            ? `${deck.slideCount} slides · ${deck.template} · ${deck.tone}`
            : isLoading
              ? 'Loading'
              : undefined
        }
        action={
          deck ? (
            <div className="flex items-center gap-2">
              <DeckDeleteDialog
                deck={deck}
                // Away before the list refetches: this page polls the deck it is showing, so
                // staying put would fire the next poll at a deck that is gone and flip the
                // screen to an error the student did not cause.
                onDeleted={() => router.replace('/decks')}
              >
                <Button variant="ghost" size="sm" aria-label="Delete this deck">
                  <Trash2 className="size-4 sm:mr-1.5" strokeWidth={1.5} aria-hidden="true" />
                  <span className="hidden sm:inline">Delete</span>
                </Button>
              </DeckDeleteDialog>
              {/* Sharing is only offered once there is a file to share: a link to a deck that
                  is still generating would 404 for whoever received it. */}
              {rendered && (
                <DeckShareDialog deck={deck}>
                  <Button variant="ghost" size="sm" aria-label="Share this deck">
                    <Share2 className="size-4 sm:mr-1.5" strokeWidth={1.5} aria-hidden="true" />
                    <span className="hidden sm:inline">Share</span>
                  </Button>
                </DeckShareDialog>
              )}
              {/* One control for both formats, and it re-renders first so what arrives is the
                  deck as it is now. Replaces PowerPoint / Download PDF / Save to Unishare. */}
              {rendered && <DeckDownloadMenu deck={deck} />}
            </div>
          ) : undefined
        }
      />

      <div className="flex-1 bg-card">
        <div className="p-6 space-y-6">
          <Link
            href="/decks"
            className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-foreground transition-colors motion-reduce:transition-none w-fit"
          >
            <ArrowLeft className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
            Back to decks
          </Link>

          {isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This deck could not be loaded. It may have been removed, or the connection dropped.
              </AlertDescription>
            </Alert>
          )}

          {isLoading && <DeckDetailSkeleton />}

          {deck && (
            <>
              {/* The prompt is the only thing a waiting deck can show of itself. */}
              {!rendered && (
                <div className="card-pop rounded-xl bg-card p-4 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Presentation
                      className="w-5 h-5 text-primary"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="min-w-0 space-y-2">
                    <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
                      Your prompt
                    </p>
                    <p className="text-sm leading-relaxed">{deck.prompt}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-xs font-mono font-normal">
                        {deck.template}
                      </Badge>
                      <Badge variant="secondary" className="text-xs font-normal">
                        {deck.slideCount} slides
                      </Badge>
                      <Badge variant="outline" className="text-xs font-mono font-normal">
                        {deck.language}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {wait && <DeckStatusNote state={wait} />}

              {deck.status === 'FAILED' && (
                <div className="space-y-3">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {deck.error ?? 'Something went wrong.'}{' '}
                      {/* A deck that once completed can only have failed on a re-render — its
                          slides and its previous files are untouched, so telling the student
                          the deck is gone would be wrong. */}
                      {isRerenderFailure(deck)
                        ? 'The last render failed. Your slides are safe in the editor and the previous version is still downloadable — try the download again.'
                        : `Every one of the ${deck.maxAttempts} attempts was used, so this deck will not start again on its own — and it does not count against your daily allowance.`}
                    </AlertDescription>
                  </Alert>
                  {!isRerenderFailure(deck) && (
                    <Button size="sm" asChild>
                      <Link href="/decks/new">Try again with a new deck</Link>
                    </Button>
                  )}
                </div>
              )}

              {/* Stated unconditionally rather than when edits are detected: the editor runs in
                  its own origin, so there is no way to know from here whether anything changed.
                  A note that is always true beats a banner that is sometimes wrong. */}
              {editable && (
                <div className="flex items-start gap-2 rounded-md border border-border bg-muted px-3 py-2 text-xs leading-relaxed text-text-muted">
                  <AlertCircle
                    className="size-3.5 shrink-0 mt-0.5"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <span>
                    Edits save as you make them. Downloading re-renders the deck first, so the file
                    you get is always the version you can see here.
                  </span>
                </div>
              )}

              {editable && deck.editorUrl && (
                <DeckEditorFrame url={deck.editorUrl} title={deck.title ?? 'this deck'} />
              )}

              {/* No editor for this deck: either it predates editing or no editor host is
                  configured. The render is still worth showing. */}
              {rendered && !editable && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 rounded-md border border-border bg-muted px-3 py-2 text-xs leading-relaxed text-text-muted">
                    <AlertCircle
                      className="size-3.5 shrink-0 mt-0.5"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                    <span>
                      This deck cannot be edited in the browser. The downloads still work.
                    </span>
                  </div>
                  {deck.hasPdf ? (
                    <DeckPreview deckId={id} version={deck.completedAt ?? ''} />
                  ) : (
                    <DeckPreviewUnavailable />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
