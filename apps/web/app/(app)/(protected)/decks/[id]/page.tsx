'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowLeft,
  Download,
  FileDown,
  Loader2,
  Presentation,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/shared/page-header'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DeckPreview, DeckPreviewUnavailable } from '@/components/decks/deck-preview'
import { DeckStatusNote } from '@/components/decks/deck-status-note'
import { SlideEditor } from '@/components/decks/slide-editor'
import {
  deckWaitState,
  hasRenderedFiles,
  isDeckRerendering,
  isRerenderFailure,
} from '@/lib/decks/waiting-state'
import { slideTitle } from '@/lib/decks/content-fields'
import type { UpdateSlideDtoContent } from '@/src/lib/api/generated/unishareAPI.schemas'
import {
  decksControllerGetDownloadUrl,
  getDecksControllerGetDeckQueryKey,
  useDecksControllerAiEditSlide,
  useDecksControllerGetDeck,
  useDecksControllerGetSlides,
  useDecksControllerReexport,
  useDecksControllerUpdateSlide,
} from '@/src/lib/api/generated/decks/decks'

const POLL_MS = 4000

function DeckDetailSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_26rem] gap-6" aria-hidden="true">
      <Skeleton className="h-[60vh] min-h-80 rounded-xl" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    </div>
  )
}

export default function DeckDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const queryClient = useQueryClient()
  const [selectedInput, setSelected] = useState(0)
  const [pane, setPane] = useState<'preview' | 'edit'>('preview')
  /**
   * The render the deck's stored files came from at the moment it was last edited. Comparing
   * it to the current completedAt is what makes the "downloads are stale" banner clear
   * itself: once a re-render finishes, completedAt moves on and the two stop matching. A
   * boolean flag would have needed an effect to clear, and would have lied after a reload.
   */
  const [staleSince, setStaleSince] = useState<string | null>(null)

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

  // A re-render flips the deck back to GENERATING even though its previous files, and the
  // slides being edited, are all still there — so "has something to show" is not "READY".
  const rerendering = Boolean(deck && isDeckRerendering(deck))
  const rendered = Boolean(deck && hasRenderedFiles(deck))
  const editable = Boolean(rendered && deck?.canEdit)

  const { data: slides, refetch: refetchSlides } = useDecksControllerGetSlides(id, {
    query: { select: (r) => r.data, enabled: editable },
  })

  const invalidateDeck = () =>
    queryClient.invalidateQueries({ queryKey: getDecksControllerGetDeckQueryKey(id) })

  const markEdited = () => setStaleSince(deck?.completedAt ?? '')

  const { mutate: updateSlide, isPending: saving } = useDecksControllerUpdateSlide({
    mutation: {
      onSuccess: () => {
        markEdited()
        refetchSlides()
        toast.success('Slide saved')
      },
      onError: () => toast.error('Could not save the slide'),
    },
  })

  const { mutate: aiEdit, isPending: aiEditing } = useDecksControllerAiEditSlide({
    mutation: {
      onSuccess: () => {
        markEdited()
        refetchSlides()
        toast.success('Slide rewritten')
      },
      onError: () => toast.error('The edit could not be applied'),
    },
  })

  const { mutate: reexport, isPending: reexporting } = useDecksControllerReexport({
    mutation: {
      onSuccess: () => {
        invalidateDeck()
        toast.success('Re-rendering — the preview updates when it finishes')
      },
      onError: () => toast.error('Could not start the re-render'),
    },
  })

  // While a re-render is running its own note says so; two overlapping warnings about the
  // same files would just compete.
  const staleRender =
    !rerendering && staleSince !== null && staleSince === (deck?.completedAt ?? '')

  // Slides can shrink after an AI edit, so the selection is clamped on read rather than
  // corrected in an effect.
  const selected = slides && selectedInput > slides.length - 1 ? 0 : selectedInput

  const wait = deck ? deckWaitState(deck) : null
  const current = slides?.[selected]

  const showSlideSkeleton = editable && slides === undefined
  const showSlides = !!slides?.length
  const showNoSlides = slides !== undefined && slides.length === 0

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
          rendered ? (
            <div className="flex items-center gap-2">
              {deck?.canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => reexport({ id })}
                  disabled={reexporting || rerendering}
                  aria-label="Update preview and downloads"
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
                  <span className="hidden sm:inline">Update preview</span>
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => download('pptx')}
                aria-label="Download the PowerPoint file"
              >
                <Download className="size-4 sm:mr-1.5" strokeWidth={1.5} aria-hidden="true" />
                <span className="hidden sm:inline">PowerPoint</span>
              </Button>
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
                        ? 'The re-render failed. Your slides are still saved, and the last successful render is still downloadable — try updating the preview again.'
                        : `Every one of the ${deck.maxAttempts} attempts was used, so this deck will not start again on its own — and it does not count against your daily allowance.`}
                    </AlertDescription>
                  </Alert>
                  {/* A re-render failure already has its retry in the header ("Update
                      preview"); a deck that never rendered has nothing to retry. */}
                  {!isRerenderFailure(deck) && (
                    <Button size="sm" asChild>
                      <Link href="/decks/new">Try again with a new deck</Link>
                    </Button>
                  )}
                </div>
              )}

              {staleRender && (
                <div
                  role="status"
                  aria-live="polite"
                  className="flex items-start gap-2 rounded-md border border-amber/40 bg-amber-subtle px-3 py-2 text-xs leading-relaxed"
                >
                  <AlertCircle
                    className="size-3.5 shrink-0 mt-0.5 text-amber"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <span>
                    Your edits are saved, but the preview and both downloads still show the previous
                    render. Use <span className="font-extrabold">Update preview</span> when you are
                    done editing.
                  </span>
                </div>
              )}

              {rendered && !deck.canEdit && (
                <div className="flex items-start gap-2 rounded-md border border-border bg-muted px-3 py-2 text-xs leading-relaxed text-text-muted">
                  <AlertCircle
                    className="size-3.5 shrink-0 mt-0.5"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <span>
                    This deck was generated before in-app editing existed, so its slides cannot be
                    changed. The downloads still work.
                  </span>
                </div>
              )}

              {rendered && (
                /* One Tabs root doing two jobs: a preview/edit switcher below md, a
                   side-by-side split above it. `forceMount` keeps both panels mounted so the
                   PDF is fetched and rendered exactly once no matter which is showing. */
                <Tabs
                  value={pane}
                  onValueChange={(v) => setPane(v as 'preview' | 'edit')}
                  className="md:grid md:grid-cols-[1fr_26rem] md:gap-6 md:items-start"
                >
                  {editable && (
                    <TabsList className="md:hidden w-full">
                      <TabsTrigger value="preview">Preview</TabsTrigger>
                      <TabsTrigger value="edit">Edit slides</TabsTrigger>
                    </TabsList>
                  )}

                  <TabsContent
                    value="preview"
                    forceMount
                    className={cn(
                      'md:block md:col-start-1',
                      editable && pane !== 'preview' && 'hidden',
                    )}
                  >
                    <div className="space-y-3">
                      {/* No PDF means the preview render failed or was never made; asking
                          for its URL is a guaranteed 404, so don't. */}
                      {deck.hasPdf ? (
                        <DeckPreview deckId={id} version={deck.completedAt ?? ''} />
                      ) : (
                        <DeckPreviewUnavailable />
                      )}
                      {deck.hasPdf && (
                        <Button variant="outline" size="sm" onClick={() => download('pdf')}>
                          <FileDown
                            className="size-3.5 mr-1.5"
                            strokeWidth={1.5}
                            aria-hidden="true"
                          />
                          Download PDF
                        </Button>
                      )}
                    </div>
                  </TabsContent>

                  {editable && (
                    <TabsContent
                      value="edit"
                      forceMount
                      className={cn('md:block md:col-start-2', pane !== 'edit' && 'hidden')}
                    >
                      {showSlideSkeleton && (
                        <div className="flex flex-col gap-3">
                          <Skeleton className="h-9 w-40 rounded-xl" />
                          <Skeleton className="h-24 w-full rounded-xl" />
                          <Skeleton className="h-10 w-full rounded-xl" />
                        </div>
                      )}

                      {showNoSlides && (
                        <p className="text-sm text-text-muted">
                          The generator returned no editable slides for this deck. The downloads
                          still work.
                        </p>
                      )}

                      {showSlides && (
                        <div className="flex flex-col gap-5">
                          <nav aria-label="Slides" className="flex flex-col gap-2">
                            <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
                              {slides.length} slides
                            </p>
                            <div className="flex gap-2 overflow-x-auto pb-1">
                              {slides.map((slide, i) => (
                                <button
                                  key={slide.id}
                                  type="button"
                                  onClick={() => setSelected(i)}
                                  aria-pressed={i === selected}
                                  aria-label={`Slide ${i + 1}: ${slideTitle(slide.content, i)}`}
                                  title={slideTitle(slide.content, i)}
                                  className={cn(
                                    'size-9 shrink-0 rounded-xl border-2 font-mono text-xs transition-colors motion-reduce:transition-none',
                                    i === selected
                                      ? 'border-border-strong bg-primary text-primary-foreground'
                                      : 'border-border text-text-muted hover:border-border-strong hover:text-foreground',
                                  )}
                                >
                                  {i + 1}
                                </button>
                              ))}
                            </div>
                          </nav>

                          {current && (
                            <SlideEditor
                              key={current.id}
                              slide={current}
                              index={selected}
                              saving={saving}
                              aiEditing={aiEditing}
                              onSave={(content) =>
                                updateSlide({
                                  id,
                                  slideId: current.id,
                                  data: { content: content as UpdateSlideDtoContent },
                                })
                              }
                              onAiEdit={(prompt) =>
                                aiEdit({ id, slideId: current.id, data: { prompt } })
                              }
                            />
                          )}
                        </div>
                      )}
                    </TabsContent>
                  )}
                </Tabs>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
