'use client'

import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  getDecksControllerGetQuotaQueryKey,
  getDecksControllerListDecksQueryKey,
  useDecksControllerCreateDeck,
} from '@/src/lib/api/generated/decks/decks'

const MIN_SLIDES = 3
const MAX_SLIDES = 15
const DEFAULT_SLIDES = 8

interface DeckCreateFormProps {
  disabled: boolean
  disabledReason?: string
}

export function DeckCreateForm({ disabled, disabledReason }: DeckCreateFormProps) {
  const [prompt, setPrompt] = useState('')
  const [slideCount, setSlideCount] = useState(DEFAULT_SLIDES)
  const queryClient = useQueryClient()

  const { mutate: createDeck, isPending } = useDecksControllerCreateDeck({
    mutation: {
      onSuccess: () => {
        setPrompt('')
        toast.success('Deck queued')
        queryClient.invalidateQueries({ queryKey: getDecksControllerListDecksQueryKey() })
        queryClient.invalidateQueries({ queryKey: getDecksControllerGetQuotaQueryKey() })
      },
      onError: (error: unknown) => {
        // A quota refusal is not a queue wait, and must not be reported as one — waiting
        // does not clear it. The API distinguishes them with a 429.
        const message =
          error instanceof Error ? error.message : 'Could not queue your deck. Try again.'
        toast.error(message)
      },
    },
  })

  const tooShort = prompt.trim().length < 10

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="space-y-2">
        <Label htmlFor="deck-prompt">What should the deck cover?</Label>
        <Textarea
          id="deck-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="The causes and consequences of the 1997 Asian financial crisis"
          rows={3}
          maxLength={2000}
          disabled={disabled || isPending}
        />
        <p className="text-xs text-muted-foreground">
          Describe the topic in a sentence or two. More detail gives better slides.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label htmlFor="deck-slides">Slides</Label>
          <input
            id="deck-slides"
            type="number"
            min={MIN_SLIDES}
            max={MAX_SLIDES}
            value={slideCount}
            onChange={(e) => setSlideCount(Number(e.target.value))}
            disabled={disabled || isPending}
            className="h-9 w-24 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
          />
        </div>

        <Button
          className="ml-auto"
          disabled={disabled || isPending || tooShort}
          onClick={() =>
            createDeck({
              data: {
                prompt: prompt.trim(),
                slideCount,
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
      </div>

      {disabled && disabledReason && (
        <p className="text-sm text-muted-foreground">{disabledReason}</p>
      )}
    </div>
  )
}
