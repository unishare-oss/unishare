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
  /**
   * The Unishare user the deck belongs to.
   *
   * Present because the generator is multi-tenant and every deck must be owned by the student
   * who asked for it — a deck generated under a shared administrator account is invisible to
   * the student in the editor, and visible to everyone else.
   */
  ownerId: string
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
 * What Unishare still asks the generator for once slide editing lives in its own embedded
 * editor: the template list for the create form, and rendering or discarding a deck we own a
 * database row for.
 *
 * Every deck-scoped call takes an `ownerId`. The generator scopes decks per user, so a call
 * made as anyone else — including the administrator whose API key we hold — gets a 404.
 */
export interface DeckEditor {
  listTemplates(): Promise<DeckTemplate[]>
  /**
   * Where the browser should point an editor frame for this deck, or null when no editor host
   * is configured.
   *
   * Behind the port so the vendor's URL shape stays inside its own directory: the frontend
   * receives a finished URL on the deck and never composes one.
   */
  editorUrlFor(externalId: string): string | null
  /** Re-renders an existing deck. No model call, so far cheaper than regenerating. */
  reexport(
    externalId: string,
    ownerId: string,
  ): Promise<{ pptx: DeckExport; pdf: DeckExport | null }>
  /**
   * Discards the generator's own copy of a deck.
   *
   * Best-effort by contract: a student deleting a deck must succeed whether or not the
   * generator is reachable, so implementations report failure by resolving, not throwing.
   * The cost of a miss is a stale presentation on the generator's disk, not a broken delete.
   */
  deletePresentation(externalId: string, ownerId: string): Promise<void>
}
