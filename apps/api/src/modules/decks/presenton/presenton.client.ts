import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type {
  DeckEditor,
  DeckExport,
  DeckGenerator,
  DeckGenerationRequest,
  DeckTemplate,
  GeneratedDeck,
} from '../deck-generator.port'
import { PDF_MIME, PPTX_MIME } from '../decks.constants'
import { PresentonAccountsService } from './presenton-accounts.service'

/**
 * Generation is a single blocking request that returns only once the deck is finished —
 * measured at ~57s for 3 slides and ~114s for 8. Every default HTTP timeout in the ecosystem
 * is shorter than that, so the ceiling here is deliberate and generous; a job that genuinely
 * hangs is caught by the queue's own timeout, not by this.
 */
const GENERATE_TIMEOUT_MS = 10 * 60 * 1000
const DOWNLOAD_TIMEOUT_MS = 2 * 60 * 1000
/** Deletion is a row and a few files on the generator's disk — it is fast or it is broken. */
const DELETE_TIMEOUT_MS = 15 * 1000

/**
 * Provider failures, in words a student can read.
 *
 * The raw body is JSON (`{"detail":"..."}`) and the status is an HTTP code — neither belongs
 * on screen. This text is stored on the deck and rendered directly, so it must not contain
 * braces, status codes, or instructions that contradict what the UI says: the generator's own
 * 429 detail ends with "Please wait and try again", which is wrong when we are already
 * retrying automatically on the student's behalf.
 *
 * The full body is logged at the call site, so nothing is lost for debugging.
 */
export function describeProviderFailure(status: number, body: string): string {
  // Deliberately not "rate limited, try shortly": the generator collapses per-minute and
  // per-DAY limits into the same 429, and on a free tier the daily cap is the likely one —
  // which no amount of waiting or retrying clears today. Saying "usage limit" is true of both
  // and promises nothing.
  if (status === 429) return 'The AI service has reached its usage limit.'
  if (status === 503 || status === 502 || status === 504) {
    return 'The AI service is temporarily unavailable.'
  }
  if (status === 401 || status === 403) {
    return 'The deck service rejected our credentials — an administrator needs to look at this.'
  }
  if (status === 400) return 'The AI service could not work with this request.'

  // Unknown status: fall back to the provider's own words if they are usable, since a vague
  // message on an unrecognised failure is worse than a specific one.
  try {
    const parsed = JSON.parse(body) as { detail?: unknown; message?: unknown }
    const detail = typeof parsed.detail === 'string' ? parsed.detail : parsed.message
    if (typeof detail === 'string' && detail.trim().length > 0) return detail.trim().slice(0, 200)
  } catch {
    // Not JSON — fall through.
  }
  return 'The AI service returned an unexpected error.'
}

interface GenerateResponse {
  presentation_id: string
  /** Server-absolute path to the exported file. Fetched by prepending the base URL verbatim. */
  path: string
  edit_path: string
}

@Injectable()
export class PresentonClient implements DeckGenerator, DeckEditor {
  private readonly logger = new Logger(PresentonClient.name)

  constructor(
    private readonly config: ConfigService,
    private readonly accounts: PresentonAccountsService,
  ) {}

  /**
   * Resolved per call rather than in the constructor on purpose: a missing key should fail the
   * one job that needs it, not stop the whole API booting. Local development and the OpenAPI
   * generation step both run without a reachable generator.
   */
  private credentials(): { baseUrl: string; apiKey: string } {
    const baseUrl = this.config.get<string>('PRESENTON_BASE_URL')
    const apiKey = this.config.get<string>('PRESENTON_API_KEY')
    if (!baseUrl || !apiKey) {
      throw new InternalServerErrorException(
        'Deck generation is not configured (PRESENTON_BASE_URL / PRESENTON_API_KEY)',
      )
    }
    return { baseUrl: baseUrl.replace(/\/+$/, ''), apiKey }
  }

  /**
   * Headers that act as the deck's owner rather than as the administrator.
   *
   * Needed by every deck-scoped call, not only generation. The generator scopes decks per
   * user, so a re-export or a delete issued with our administrator API key 404s on a
   * student's deck — verified against the running instance.
   */
  private async asOwner(ownerId: string): Promise<Record<string, string>> {
    return { Cookie: await this.accounts.sessionFor(ownerId) }
  }

  async generate(request: DeckGenerationRequest): Promise<GeneratedDeck> {
    const { baseUrl } = this.credentials()
    const started = Date.now()
    const auth = await this.asOwner(request.ownerId)

    const res = await fetch(`${baseUrl}/api/v1/ppt/presentation/generate`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: request.prompt,
        n_slides: request.slideCount,
        language: request.language,
        template: request.template,
        tone: request.tone,
        verbosity: request.verbosity,
        web_search: request.webSearch,
        include_title_slide: request.includeTitleSlide,
        include_table_of_contents: request.includeTableOfContents,
        ...(request.instructions ? { instructions: request.instructions } : {}),
        export_as: 'pptx',
      }),
      signal: AbortSignal.timeout(GENERATE_TIMEOUT_MS),
    })

    if (!res.ok) {
      const body = (await res.text().catch(() => '')).slice(0, 500)
      // Status and raw body to the log; a human sentence to the caller.
      this.logger.warn(`generate failed ${res.status}: ${body || 'no response body'}`)
      // A rejected session is the one failure worth clearing: the retry then logs in again
      // instead of replaying the same dead cookie for all three attempts.
      if (res.status === 401) await this.accounts.invalidate(request.ownerId)
      throw new InternalServerErrorException(describeProviderFailure(res.status, body))
    }

    const body = (await res.json()) as GenerateResponse
    if (!body?.path || !body?.presentation_id) {
      throw new InternalServerErrorException('Deck generation returned no file path')
    }

    // The path is server-absolute and is served as-is; the /static and prefix-stripped
    // variants both 404, so do not be tempted to normalise it.
    const file = await fetch(`${baseUrl}${body.path}`, {
      headers: auth,
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    })

    if (!file.ok) {
      this.logger.warn(`deck download failed ${file.status} for ${body.presentation_id}`)
      throw new InternalServerErrorException('The deck was generated but could not be retrieved.')
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // A second export of the SAME presentation. This is a re-render, not another model run,
    // so it costs a few seconds and no tokens — cheap enough to do for every deck so the
    // preview is always ready. Failing to produce it must not fail the generation.
    const pdf = await this.tryExport(baseUrl, auth, body.presentation_id, 'pdf')

    this.logger.log(
      `Generated deck ${body.presentation_id}: ${request.slideCount} slides, ` +
        `${buffer.byteLength} bytes, ${((Date.now() - started) / 1000).toFixed(1)}s` +
        `${pdf ? '' : ' (pdf export failed)'}`,
    )

    return {
      externalId: body.presentation_id,
      // Trust our own export request over a Content-Type header we did not set.
      pptx: { buffer, mimeType: PPTX_MIME },
      pdf,
      filename: decodeURIComponent(body.path.split('/').pop() ?? 'deck.pptx'),
    }
  }

  // --- DeckEditor ---------------------------------------------------------------------------

  /**
   * The one call with no owner. Templates are instance-wide rather than per-student, so the
   * administrator API key is both sufficient and cheaper than brokering a session to fill a
   * dropdown on the create form.
   */
  async listTemplates(): Promise<DeckTemplate[]> {
    const { baseUrl, apiKey } = this.credentials()
    const rows = await this.getJson<unknown>(
      baseUrl,
      { Authorization: `Bearer ${apiKey}` },
      '/api/v1/ppt/template/all?page_size=50&default=true',
    )
    const items = Array.isArray(rows) ? rows : []
    return items
      .filter((t): t is Record<string, unknown> => typeof t === 'object' && t !== null)
      .map((t) => ({
        id: String(t.id ?? ''),
        name: String(t.name ?? t.id ?? ''),
        // The generator returns the string "None" for a missing description, not null.
        description:
          typeof t.description === 'string' && t.description !== 'None' ? t.description : null,
      }))
      .filter((t) => t.id.length > 0)
  }

  /**
   * Built from a browser-reachable base URL, not PRESENTON_BASE_URL: that one is the in-cluster
   * service address, which resolves for the API and nowhere else.
   */
  editorUrlFor(externalId: string): string | null {
    const base = this.config.get<string>('DECK_EDITOR_URL')
    if (!base) return null
    return `${base.replace(/\/+$/, '')}/presentation?id=${encodeURIComponent(externalId)}`
  }

  async reexport(
    externalId: string,
    ownerId: string,
  ): Promise<{ pptx: DeckExport; pdf: DeckExport | null }> {
    const { baseUrl } = this.credentials()
    const auth = await this.asOwner(ownerId)
    const pptx = await this.tryExport(baseUrl, auth, externalId, 'pptx')
    if (!pptx) {
      throw new InternalServerErrorException('Deck could not be re-exported')
    }
    const pdf = await this.tryExport(baseUrl, auth, externalId, 'pdf')
    return { pptx, pdf }
  }

  /**
   * Never throws. See DeckEditor.deletePresentation: the student's delete has already been
   * recorded by the time this runs, so a failure here can only be logged. A 404 is a success
   * in every way that matters — the generator does not have the deck, which is the goal.
   */
  async deletePresentation(externalId: string, ownerId: string): Promise<void> {
    try {
      const { baseUrl } = this.credentials()
      const auth = await this.asOwner(ownerId)
      const res = await fetch(`${baseUrl}/api/v1/ppt/presentation/${externalId}`, {
        method: 'DELETE',
        headers: auth,
        signal: AbortSignal.timeout(DELETE_TIMEOUT_MS),
      })
      if (!res.ok && res.status !== 404) {
        this.logger.warn(`Generator delete failed ${res.status} for ${externalId}`)
      }
    } catch (err) {
      this.logger.warn(`Generator delete errored for ${externalId}: ${String(err)}`)
    }
  }

  // --- internals ----------------------------------------------------------------------------

  /**
   * Export is best-effort for the PDF: a deck with a working PPTX and no preview is a far
   * better outcome than a failed generation, so callers decide whether null is fatal.
   */
  private async tryExport(
    baseUrl: string,
    auth: Record<string, string>,
    externalId: string,
    format: 'pptx' | 'pdf',
  ): Promise<DeckExport | null> {
    try {
      const res = await fetch(`${baseUrl}/api/v1/ppt/presentation/${externalId}/export`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ export_as: format }),
        signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
      })
      if (!res.ok) return null
      const body = (await res.json()) as GenerateResponse
      if (!body?.path) return null

      const file = await fetch(`${baseUrl}${body.path}`, {
        headers: auth,
        signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
      })
      if (!file.ok) return null

      return {
        buffer: Buffer.from(await file.arrayBuffer()),
        mimeType: format === 'pdf' ? PDF_MIME : PPTX_MIME,
      }
    } catch (err) {
      this.logger.warn(`Export ${format} failed for ${externalId}: ${String(err)}`)
      return null
    }
  }

  private async getJson<T>(
    baseUrl: string,
    auth: Record<string, string>,
    path: string,
  ): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      headers: auth,
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    })
    if (!res.ok) {
      const body = (await res.text().catch(() => '')).slice(0, 300)
      this.logger.warn(`deck service ${path} failed ${res.status}: ${body || 'no body'}`)
      throw new InternalServerErrorException(describeProviderFailure(res.status, body))
    }
    return (await res.json()) as T
  }
}
