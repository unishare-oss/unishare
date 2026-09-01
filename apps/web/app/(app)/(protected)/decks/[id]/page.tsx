'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Download, Loader2, RefreshCw, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { DeckPreview } from '@/components/decks/deck-preview'
import { SlideEditor } from '@/components/decks/slide-editor'
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

export default function DeckDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState(0)
  const [staleRender, setStaleRender] = useState(false)

  const { data: deck } = useDecksControllerGetDeck(id, {
    query: {
      select: (r) => r.data,
      refetchInterval: (query) => {
        const status = (query.state.data as { data?: { status?: string } } | undefined)?.data
          ?.status
        return status === 'QUEUED' || status === 'GENERATING' ? POLL_MS : false
      },
    },
  })

  const ready = deck?.status === 'READY'

  const { data: slides, refetch: refetchSlides } = useDecksControllerGetSlides(id, {
    query: { select: (r) => r.data, enabled: Boolean(ready && deck?.canEdit) },
  })

  const invalidateDeck = () =>
    queryClient.invalidateQueries({ queryKey: getDecksControllerGetDeckQueryKey(id) })

  const { mutate: updateSlide, isPending: saving } = useDecksControllerUpdateSlide({
    mutation: {
      onSuccess: () => {
        setStaleRender(true)
        refetchSlides()
      },
      onError: () => toast.error('Could not save the slide'),
    },
  })

  const { mutate: aiEdit, isPending: aiEditing } = useDecksControllerAiEditSlide({
    mutation: {
      onSuccess: () => {
        setStaleRender(true)
        refetchSlides()
        toast.success('Slide rewritten')
      },
      onError: () => toast.error('The edit could not be applied'),
    },
  })

  const { mutate: reexport, isPending: reexporting } = useDecksControllerReexport({
    mutation: {
      onSuccess: () => {
        setStaleRender(false)
        invalidateDeck()
        toast.success('Re-rendering — the preview will update shortly')
      },
      onError: () => toast.error('Could not start the re-render'),
    },
  })

  // Once a queued re-render finishes, the preview must refetch its presigned URL.
  useEffect(() => {
    if (ready) setStaleRender((s) => s)
  }, [ready])

  const busy = deck?.status === 'GENERATING' || deck?.status === 'QUEUED'
  const current = slides?.[selected]

  async function download(format: 'pptx' | 'pdf') {
    try {
      const res = await decksControllerGetDownloadUrl(id, { format })
      window.open(res.data.url, '_blank', 'noopener,noreferrer')
    } catch {
      toast.error(`No ${format.toUpperCase()} available for this deck`)
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href="/decks"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to decks
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold text-foreground">
            {deck?.title ?? deck?.prompt ?? 'Deck'}
          </h1>
          {deck && (
            <p className="mt-1 text-sm text-muted-foreground">
              {deck.slideCount} slides · {deck.template} · {deck.tone}
            </p>
          )}
        </div>

        {ready && (
          <div className="flex flex-wrap gap-2">
            {staleRender && (
              <Button onClick={() => reexport({ id })} disabled={reexporting}>
                {reexporting ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 size-4" />
                )}
                Update preview & downloads
              </Button>
            )}
            <Button variant="secondary" onClick={() => download('pptx')}>
              <Download className="mr-2 size-4" />
              PowerPoint
            </Button>
            {deck.hasPdf && (
              <Button variant="secondary" onClick={() => download('pdf')}>
                <Download className="mr-2 size-4" />
                PDF
              </Button>
            )}
          </div>
        )}
      </div>

      {staleRender && (
        <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
          Your edits are saved, but the preview and downloads still show the previous render. Use{' '}
          <span className="font-medium text-foreground">Update preview &amp; downloads</span> when
          you are done editing.
        </p>
      )}

      {busy && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {deck?.status === 'QUEUED' && (deck.queueAhead ?? 0) > 0
            ? `${deck.queueAhead} ahead of yours`
            : 'Working on it — this usually takes a couple of minutes'}
        </div>
      )}

      {deck?.status === 'FAILED' && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>{deck.error ?? 'Generation failed'}</span>
        </div>
      )}

      {ready && (
        <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
          <DeckPreview deckId={id} version={deck.completedAt ?? ''} />

          <div className="space-y-4">
            {slides && slides.length > 0 ? (
              <>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {slides.map((slide, i) => (
                    <button
                      key={slide.id}
                      type="button"
                      onClick={() => setSelected(i)}
                      title={slideTitle(slide.content, i)}
                      className={cn(
                        'size-9 shrink-0 rounded-md border text-sm transition-colors',
                        i === selected
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-primary/50',
                      )}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                <Separator />

                {current && (
                  <SlideEditor
                    slide={current}
                    saving={saving}
                    aiEditing={aiEditing}
                    onSave={(content) =>
                      updateSlide({
                        id,
                        slideId: current.id,
                        data: { content: content as UpdateSlideDtoContent },
                      })
                    }
                    onAiEdit={(prompt) => aiEdit({ id, slideId: current.id, data: { prompt } })}
                  />
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                This deck cannot be edited — it was generated before editing was available.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
