'use client'

import { useRouter } from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { Clock, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { DeckOptions } from '@/components/decks/deck-options'
import { DeckStatusNote } from '@/components/decks/deck-status-note'
import { TemplatePicker } from '@/components/decks/template-picker'
import {
  DECK_FORM_DEFAULTS,
  MAX_PROMPT,
  MAX_SLIDES,
  MIN_SLIDES,
  deckFormSchema,
  type DeckFormValues,
} from '@/components/decks/deck-form-schema'
import {
  getDecksControllerGetQuotaQueryKey,
  getDecksControllerListDecksQueryKey,
  useDecksControllerCreateDeck,
  useDecksControllerGetQuota,
} from '@/src/lib/api/generated/decks/decks'

const LABEL = 'font-mono text-[11px] uppercase tracking-wider text-text-muted'

export function DeckCreateForm() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const form = useForm<DeckFormValues>({
    resolver: zodResolver(deckFormSchema),
    defaultValues: DECK_FORM_DEFAULTS,
    mode: 'onChange',
  })

  const prompt = useWatch({ control: form.control, name: 'prompt' })
  const slideCount = useWatch({ control: form.control, name: 'slideCount' })

  const { data: quota } = useDecksControllerGetQuota({ query: { select: (r) => r.data } })

  // Over quota is not a refusal — the API accepts the deck and holds it until a slot frees
  // (decks.service.ts createDeck). Disabling submit here would throw away a prompt the
  // student has already written, which is the exact failure the backend was built to avoid.
  const overQuota = Boolean(quota) && (quota?.used ?? 0) >= (quota?.limit ?? 0)
  const heldUntil = overQuota && quota?.nextSlotAt ? new Date(quota.nextSlotAt) : null

  const { mutate: createDeck, isPending } = useDecksControllerCreateDeck({
    mutation: {
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: getDecksControllerListDecksQueryKey() })
        queryClient.invalidateQueries({ queryKey: getDecksControllerGetQuotaQueryKey() })
        toast.success(
          overQuota
            ? 'Deck accepted — it starts when your allowance frees up'
            : 'Deck queued — generation runs in the background',
        )
        // Straight to the deck: generation takes minutes, and the deck page is where
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

  function onSubmit(values: DeckFormValues) {
    createDeck({
      data: {
        prompt: values.prompt.trim(),
        slideCount: values.slideCount,
        tone: values.tone,
        verbosity: values.verbosity,
        language: values.language,
        includeTitleSlide: values.includeTitleSlide,
        includeTableOfContents: values.includeTableOfContents,
        webSearch: values.webSearch,
        ...(values.template ? { template: values.template } : {}),
        ...(values.instructions.trim() ? { instructions: values.instructions.trim() } : {}),
      },
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
        {heldUntil && (
          <DeckStatusNote
            state={{
              kind: 'quota-held',
              message: `You have used all ${quota?.limit} decks for today. This one will still be accepted — it starts ${formatDistanceToNow(heldUntil, { addSuffix: true })}.`,
              icon: Clock,
              spin: false,
              tone: 'progress',
            }}
          />
        )}

        <FormField
          control={form.control}
          name="prompt"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={LABEL}>What should the deck cover?</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  maxLength={MAX_PROMPT}
                  disabled={isPending}
                  placeholder="The causes and consequences of the 1997 Asian financial crisis"
                  {...field}
                />
              </FormControl>
              <p className="text-xs text-text-muted mt-1.5">
                {prompt?.length ?? 0}/{MAX_PROMPT} — a sentence or two. More detail gives better
                slides.
              </p>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <TemplatePicker disabled={isPending} />

        <FormField
          control={form.control}
          name="slideCount"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={LABEL}>
                Slides <span className="text-foreground">{slideCount}</span>
              </FormLabel>
              <FormControl>
                <Slider
                  min={MIN_SLIDES}
                  max={MAX_SLIDES}
                  step={1}
                  value={[field.value]}
                  onValueChange={([v]) => field.onChange(v)}
                  disabled={isPending}
                  aria-label="Number of slides"
                  className="sm:max-w-md"
                />
              </FormControl>
              <div className="flex justify-between font-mono text-[11px] text-text-muted sm:max-w-md">
                <span>{MIN_SLIDES}</span>
                <span>{MAX_SLIDES}</span>
              </div>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <DeckOptions disabled={isPending} />

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
          <Button type="submit" size="sm" disabled={isPending || !form.formState.isValid}>
            {isPending ? (
              <Loader2 className="size-4 mr-2 animate-spin" strokeWidth={1.5} />
            ) : (
              <Sparkles className="size-4 mr-1.5" strokeWidth={1.5} aria-hidden="true" />
            )}
            {overQuota ? 'Queue deck for later' : 'Generate deck'}
          </Button>
          {quota && (
            <span className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
              {quota.used} of {quota.limit} used today
            </span>
          )}
        </div>
      </form>
    </Form>
  )
}
