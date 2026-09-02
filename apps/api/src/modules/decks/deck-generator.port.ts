/**
 * The boundary between Unishare and whatever generates and edits slides.
 *
 * Nothing in this file names a vendor, and nothing outside `presenton/` imports one. Swapping
 * the backing service is a new class behind these interfaces plus one line in decks.module.ts;
 * the service, processor, controller and frontend are untouched. It is also what makes the
 * feature testable without a running generator — see the fakes in decks.service.spec.ts.
 */
export const DECK_GENERATOR = Symbol('DECK_GENERATOR')
export const DECK_EDITOR = Symbol('DECK_EDITOR')

export interface DeckGenerationRequest {
  prompt: string
  slideCount: number
  language: string
  template: string
  tone: string
  verbosity: string
  instructions?: string | null
  includeTitleSlide: boolean
  includeTableOfContents: boolean
  webSearch: boolean
}

export interface DeckExport {
  buffer: Buffer
  mimeType: string
}

export interface GeneratedDeck {
  /** The generator's id for this deck. Required later by every edit and re-export call. */
  externalId: string
  pptx: DeckExport
  /** A re-render of the same deck, not a second generation. Powers the in-app preview. */
  pdf: DeckExport | null
  /** The generator's filename, kept for diagnostics. NOT used as an object key. */
  filename: string
}

export interface DeckGenerator {
  generate(request: DeckGenerationRequest): Promise<GeneratedDeck>
}

export interface DeckTemplate {
  id: string
  name: string
  description: string | null
}

/**
 * One slide as the generator models it.
 *
 * `content` is deliberately `unknown`: its shape is defined by `layout`, differs per layout,
 * and the same field is called `headline_text` in one and `slide_headline` in another. The
 * editor walks it generically rather than knowing any layout, which is what keeps it working
 * when the generator ships a layout we have never seen.
 */
export interface DeckSlide {
  id: string
  index: number
  layout: string
  content: unknown
  /**
   * The slide exactly as the generator returned it.
   *
   * `slide_update` takes a whole slide, not a patch, so an update has to send every field
   * back — including ones we never model (`speaker_note`, `properties`, `ui`). Editing only
   * the fields we know about and posting that would silently drop the rest.
   */
  raw: Record<string, unknown>
}

export interface DeckEditor {
  listTemplates(): Promise<DeckTemplate[]>
  getSlides(externalId: string): Promise<DeckSlide[]>
  /** Writes edited content back verbatim. */
  updateSlide(slide: DeckSlide): Promise<void>
  /** Natural-language edit: the generator rewrites the slide from an instruction. */
  aiEditSlide(slideId: string, prompt: string): Promise<void>
  /** Re-renders an existing deck. No model call, so far cheaper than regenerating. */
  reexport(externalId: string): Promise<{ pptx: DeckExport; pdf: DeckExport | null }>
  /**
   * Discards the generator's own copy of a deck.
   *
   * Best-effort by contract: a student deleting a deck must succeed whether or not the
   * generator is reachable, so implementations report failure by resolving, not throwing.
   * The cost of a miss is a stale presentation on the generator's disk, not a broken delete.
   */
  deletePresentation(externalId: string): Promise<void>
}
