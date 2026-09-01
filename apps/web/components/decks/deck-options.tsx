'use client'

import { useFormContext, useWatch } from 'react-hook-form'
import { ChevronDown } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  LANGUAGES,
  MAX_INSTRUCTIONS,
  TONES,
  VERBOSITIES,
  type DeckFormValues,
} from '@/components/decks/deck-form-schema'

const LABEL = 'font-mono text-[11px] uppercase tracking-wider text-text-muted'

/**
 * Tone and detail are always visible because they change every slide. Everything else is
 * behind a disclosure: they are answers to questions most students do not have.
 */
export function DeckOptions({ disabled }: { disabled?: boolean }) {
  const form = useFormContext<DeckFormValues>()
  const instructions = useWatch({ control: form.control, name: 'instructions' })

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="tone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={LABEL}>Tone</FormLabel>
              <Select disabled={disabled} value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {TONES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="verbosity"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={LABEL}>Detail</FormLabel>
              <Select disabled={disabled} value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {VERBOSITIES.map((v) => (
                    <SelectItem key={v.value} value={v.value}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </div>

      <Collapsible>
        <CollapsibleTrigger className="group flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-text-muted hover:text-foreground transition-colors motion-reduce:transition-none">
          More options
          <ChevronDown
            className="size-3.5 transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </CollapsibleTrigger>

        <CollapsibleContent className="flex flex-col gap-5 pt-5">
          <FormField
            control={form.control}
            name="language"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={LABEL}>Language</FormLabel>
                <Select disabled={disabled} value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full sm:w-56">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="instructions"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={LABEL}>Extra instructions</FormLabel>
                <FormControl>
                  <Textarea
                    rows={2}
                    maxLength={MAX_INSTRUCTIONS}
                    disabled={disabled}
                    placeholder="Focus on the practical steps rather than the history"
                    {...field}
                  />
                </FormControl>
                <p className="text-xs text-text-muted mt-1.5">
                  {instructions?.length ?? 0}/{MAX_INSTRUCTIONS}
                </p>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <SwitchField
            name="includeTitleSlide"
            label="Title slide"
            hint="Opens with a cover slide carrying the deck title."
            disabled={disabled}
          />
          <SwitchField
            name="includeTableOfContents"
            label="Table of contents"
            hint="Adds an agenda slide after the cover."
            disabled={disabled}
          />
          <SwitchField
            name="webSearch"
            label="Search the web"
            hint="Slower, and pulls in material beyond your prompt."
            disabled={disabled}
          />
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

function SwitchField({
  name,
  label,
  hint,
  disabled,
}: {
  name: 'includeTitleSlide' | 'includeTableOfContents' | 'webSearch'
  label: string
  hint: string
  disabled?: boolean
}) {
  const form = useFormContext<DeckFormValues>()

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <FormLabel className={LABEL}>{label}</FormLabel>
            <FormDescription className="text-xs text-text-muted mt-1">{hint}</FormDescription>
          </div>
          <FormControl>
            <Switch
              checked={field.value}
              onCheckedChange={field.onChange}
              disabled={disabled}
              className="shrink-0"
            />
          </FormControl>
        </FormItem>
      )}
    />
  )
}
