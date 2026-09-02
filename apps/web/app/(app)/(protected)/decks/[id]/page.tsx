'use client'

import { use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  ArrowLeft,
  Download,
  FileDown,
  Loader2,
  Presentation,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { DeckPreview, DeckPreviewUnavailable } from '@/components/decks/deck-preview'
import { DeckStatusNote } from '@/components/decks/deck-status-note'
import { DeckDeleteDialog } from '@/components/decks/deck-delete-dialog'
import { DeckEditorFrame } from '@/components/decks/deck-editor-frame'
import { deckWaitState, hasRenderedFiles, isDeckRerendering } from '@/lib/decks/waiting-state'
import { isRerenderFailure } from '@/lib/decks/waiting-state'
import {
  decksControllerGetDownloadUrl,
  getDecksControllerGetDeckQueryKey,
  useDecksControllerGetDeck,
  useDecksControllerReexport,
} from '@/src/lib/api/generated/decks/decks'

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
  const queryClient = useQueryClient()

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
  const rerendering = Boolean(deck && isDeckRerendering(deck))
  const rendered = Boolean(deck && hasRenderedFiles(deck))
  const editable = Boolean(rendered && deck?.canEdit && deck?.editorUrl)

  const { mutate: reexport, isPending: reexporting } = useDecksControllerReexport({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getDecksControllerGetDeckQueryKey(id) })
        toast.success('Saving to Unishare — this takes a few seconds')
      },
      onError: () => toast.error('Could not start the re-render'),
    },
  })

  const wait = deck ? deckWaitState(deck) : null

  async function download(format: 'pptx' | 'pdf') {
    try {
      const res = await decksControllerGetDownloadUrl(id, { format })
      window.open(res.data.url, '_blank', 'noopener,noreferrer')
    } catch {
      toast.error(
        format === 'pdf'
          ? 'No PDF preview was rendered for this deck'
          : 'The PowerPoint file is not ready yet',
      )
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title={deck?.title ?? 'Deck'}
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
              {rendered && deck.canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => reexport({ id })}
                  disabled={reexporting || rerendering}
                  aria-label="Save your edits to the Unishare copy of this deck"
                >
                  {reexporting || rerendering ? (
                    <Loader2 className="size-3.5 sm:mr-1.5 animate-spin" strokeWidth={1.5} />
                  ) : (
                    <RefreshCw
                      className="size-3.5 sm:mr-1.5"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  )}
                  <span className="hidden sm:inline">Save to Unishare</span>
                </Button>
              )}
              {rendered && (
                <Button
                  size="sm"
                  onClick={() => download('pptx')}
                  aria-label="Download the PowerPoint file"
                >
                  <Download className="size-4 sm:mr-1.5" strokeWidth={1.5} aria-hidden="true" />
                  <span className="hidden sm:inline">PowerPoint</span>
                </Button>
              )}
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
                        ? 'Saving to Unishare failed. Your slides are safe in the editor and the previous version is still downloadable — try Save to Unishare again.'
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
                    Edits save as you make them, and the editor&apos;s own Export always gives you
                    the current deck. The Unishare copy — what your library shows and what the
                    PowerPoint button downloads — updates when you choose{' '}
                    <span className="font-extrabold text-foreground">Save to Unishare</span>.
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
                  {deck.hasPdf && (
                    <Button variant="outline" size="sm" onClick={() => download('pdf')}>
                      <FileDown className="size-3.5 mr-1.5" strokeWidth={1.5} aria-hidden="true" />
                      Download PDF
                    </Button>
                  )}
                </div>
              )}

              {/* Available for every rendered deck, editable or not — the PDF is the render the
                  student will actually hand in. */}
              {editable && deck.hasPdf && (
                <Button variant="outline" size="sm" onClick={() => download('pdf')}>
                  <FileDown className="size-3.5 mr-1.5" strokeWidth={1.5} aria-hidden="true" />
                  Download PDF
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
