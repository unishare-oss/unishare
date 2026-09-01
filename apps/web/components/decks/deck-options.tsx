'use client'

import { ChevronDown } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type {
  CreateDeckDtoTone,
  CreateDeckDtoVerbosity,
} from '@/src/lib/api/generated/unishareAPI.schemas'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export const TONES: { value: CreateDeckDtoTone; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'educational', label: 'Educational' },
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'funny', label: 'Funny' },
  { value: 'sales_pitch', label: 'Sales pitch' },
]

export const VERBOSITIES: { value: CreateDeckDtoVerbosity; label: string }[] = [
  { value: 'concise', label: 'Concise' },
  { value: 'standard', label: 'Standard' },
  { value: 'text-heavy', label: 'Text-heavy' },
]

export interface DeckOptionsState {
  tone: CreateDeckDtoTone
  verbosity: CreateDeckDtoVerbosity
  language: string
  instructions: string
  includeTitleSlide: boolean
  includeTableOfContents: boolean
  webSearch: boolean
}

export const DEFAULT_OPTIONS: DeckOptionsState = {
  tone: 'educational',
  verbosity: 'standard',
  language: 'English',
  instructions: '',
  includeTitleSlide: true,
  includeTableOfContents: false,
  webSearch: false,
}

interface DeckOptionsProps {
  value: DeckOptionsState
  onChange: (next: DeckOptionsState) => void
  disabled?: boolean
}

export function DeckOptions({ value, onChange, disabled }: DeckOptionsProps) {
  const set = <K extends keyof DeckOptionsState>(key: K, v: DeckOptionsState[K]) =>
    onChange({ ...value, [key]: v })

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Tone</Label>
          <Select
            disabled={disabled}
            value={value.tone}
            onValueChange={(v) => set('tone', v as CreateDeckDtoTone)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TONES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Detail</Label>
          <Select
            disabled={disabled}
            value={value.verbosity}
            onValueChange={(v) => set('verbosity', v as CreateDeckDtoVerbosity)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VERBOSITIES.map((v) => (
                <SelectItem key={v.value} value={v.value}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Collapsible>
        <CollapsibleTrigger className="group flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          More options
          <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="deck-instructions">Extra instructions</Label>
            <Textarea
              id="deck-instructions"
              rows={2}
              maxLength={1000}
              disabled={disabled}
              value={value.instructions}
              onChange={(e) => set('instructions', e.target.value)}
              placeholder="Focus on the practical steps rather than the history"
            />
          </div>

          <Toggle
            id="title-slide"
            label="Title slide"
            checked={value.includeTitleSlide}
            disabled={disabled}
            onChange={(v) => set('includeTitleSlide', v)}
          />
          <Toggle
            id="toc"
            label="Table of contents"
            checked={value.includeTableOfContents}
            disabled={disabled}
            onChange={(v) => set('includeTableOfContents', v)}
          />
          <Toggle
            id="web-search"
            label="Search the web"
            hint="Slower, and pulls in material beyond your prompt"
            checked={value.webSearch}
            disabled={disabled}
            onChange={(v) => set('webSearch', v)}
          />
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

function Toggle({
  id,
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  id: string
  label: string
  hint?: string
  checked: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <Label htmlFor={id}>{label}</Label>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  )
}
