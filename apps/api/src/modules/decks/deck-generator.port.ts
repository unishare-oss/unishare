/**
 * The boundary between Unishare and whatever generates slides.
 *
 * Nothing in this file names a vendor, and nothing outside `presenton/` imports one. Swapping
 * the backing service is a new class behind this interface plus one line in decks.module.ts;
 * the service, processor, controller and frontend are untouched. It is also what makes the
 * feature testable without a running generator — see the fake in decks.service.spec.ts.
 */
export const DECK_GENERATOR = Symbol('DECK_GENERATOR')

export interface DeckGenerationRequest {
  prompt: string
  slideCount: number
  language: string
  template: string
}

export interface GeneratedDeck {
  /** The generator's own id for this deck. Opaque to us; stored for support/debugging only. */
  externalId: string
  buffer: Buffer
  mimeType: string
  /** The generator's filename, kept for diagnostics. NOT used as an object key. */
  filename: string
}

export interface DeckGenerator {
  generate(request: DeckGenerationRequest): Promise<GeneratedDeck>
}
