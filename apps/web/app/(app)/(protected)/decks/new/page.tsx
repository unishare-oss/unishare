'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { TemplatePicker } from '@/components/decks/template-picker'
import {
  DEFAULT_OPTIONS,
  DeckOptions,
  type DeckOptionsState,
} from '@/components/decks/deck-options'
import {
  getDecksControllerGetQuotaQueryKey,
  getDecksControllerListDecksQueryKey,
  useDecksControllerCreateDeck,
  useDecksControllerGetQuota,
} from '@/src/lib/api/generated/decks/decks'

const MIN_SLIDES = 3
const MAX_SLIDES = 15

export default function NewDeckPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [prompt, setPrompt] = useState('')
  const [slideCount, setSlideCount] = useState(8)
  const [template, setTemplate] = useState('general')
  const [options, setOptions] = useState<DeckOptionsState>(DEFAULT_OPTIONS)

  const { data: quota } = useDecksControllerGetQuota({ query: { select: (r) => r.data } })
  const exhausted = Boolean(quota) && (quota?.used ?? 0) >= (quota?.limit ?? 0)

  const { mutate: createDeck, isPending } = useDecksControllerCreateDeck({
    mutation: {
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: getDecksControllerListDecksQueryKey() })
        queryClient.invalidateQueries({ queryKey: getDecksControllerGetQuotaQueryKey() })
        // Straight to the deck — generation takes minutes and the detail page is where
        // progress, and then the result, actually live.
        router.push(`/decks/${res.data.id}`)
      },
      onError: (error: unknown) => {
        toast.error(
          error instanceof Error ? error.message : 'Could not queue your deck. Try again.',
        )
      },
    },
  })

  const disabled = exhausted || isPending
  const tooShort = prompt.trim().length < 10

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href="/decks"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to decks
      </Link>

      <PageHeader title="New deck" subtitle="Describe the topic and pick a look." />

      {exhausted && (
        <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
          You have used all {quota?.limit} decks for today. Your allowance resets shortly.
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="deck-prompt">What should the deck cover?</Label>
        <Textarea
          id="deck-prompt"
          rows={4}
          maxLength={2000}
          value={prompt}
          disabled={disabled}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="The causes and consequences of the 1997 Asian financial crisis"
        />
        <p className="text-xs text-muted-foreground">
          A sentence or two. More detail gives better slides.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Template</Label>
        <TemplatePicker value={template} onChange={setTemplate} disabled={disabled} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="deck-slides">Slides</Label>
        <Input
          id="deck-slides"
          type="number"
          min={MIN_SLIDES}
          max={MAX_SLIDES}
          className="w-24"
          value={slideCount}
          disabled={disabled}
          onChange={(e) => setSlideCount(Number(e.target.value))}
        />
      </div>

      <DeckOptions value={options} onChange={setOptions} disabled={disabled} />

      <div className="flex items-center gap-3 border-t border-border pt-4">
        <Button
          disabled={disabled || tooShort}
          onClick={() =>
            createDeck({
              data: {
                prompt: prompt.trim(),
                slideCount,
                template,
                tone: options.tone,
                verbosity: options.verbosity,
                language: options.language,
                includeTitleSlide: options.includeTitleSlide,
                includeTableOfContents: options.includeTableOfContents,
                webSearch: options.webSearch,
                ...(options.instructions.trim()
                  ? { instructions: options.instructions.trim() }
                  : {}),
              },
            })
          }
        >
          {isPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 size-4" />
          )}
          Generate deck
        </Button>
        {quota && (
          <span className="text-sm text-muted-foreground">
            {quota.used} of {quota.limit} used today
          </span>
        )}
      </div>
    </div>
  )
}
