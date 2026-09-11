import { z } from 'zod'
import type {
  CreateDeckDtoTone,
  CreateDeckDtoVerbosity,
} from '@/src/lib/api/generated/unishareAPI.schemas'

export const MIN_SLIDES = 3
/** Mirrors MAX_SLIDES in the API's decks.constants.ts, which explains why it is 14. */
export const MAX_SLIDES = 14
export const MAX_PROMPT = 2000
export const MIN_PROMPT = 10
export const MAX_INSTRUCTIONS = 1000

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

export const LANGUAGES = ['English', 'Burmese', 'Thai', 'Chinese', 'Japanese', 'French', 'German']

/** Mirrors CreateDeckDto's server-side bounds so a rejection is never the first feedback. */
export const deckFormSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(MIN_PROMPT, 'Give the topic at least a sentence — around ten characters.')
    .max(MAX_PROMPT, `Keep the topic under ${MAX_PROMPT} characters.`),
  slideCount: z.number().int().min(MIN_SLIDES).max(MAX_SLIDES),
  /**
   * Optional on purpose. The template list comes from the external generator at runtime, so
   * hard-coding a default here risks pre-selecting an id that is not in the list. Left empty,
   * the server applies its own default instead of the form asserting one.
   */
  template: z.string(),
  tone: z.enum(['default', 'casual', 'professional', 'funny', 'educational', 'sales_pitch']),
  verbosity: z.enum(['concise', 'standard', 'text-heavy']),
  language: z.string().min(1),
  instructions: z.string().max(MAX_INSTRUCTIONS, `Keep this under ${MAX_INSTRUCTIONS} characters.`),
  includeTitleSlide: z.boolean(),
  includeTableOfContents: z.boolean(),
  webSearch: z.boolean(),
})

export type DeckFormValues = z.infer<typeof deckFormSchema>

export const DECK_FORM_DEFAULTS: DeckFormValues = {
  prompt: '',
  slideCount: 8,
  template: '',
  tone: 'educational',
  // Mirrors DEFAULT_VERBOSITY in the API: fewer over-long slides means fewer generator
  // retries, and retries are what exhaust the provider's per-minute token budget.
  verbosity: 'concise',
  language: 'English',
  instructions: '',
  includeTitleSlide: true,
  includeTableOfContents: false,
  webSearch: false,
}
