import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type {
  DeckEditor,
  DeckExport,
  DeckGenerator,
  DeckGenerationRequest,
  DeckPhase,
  DeckProgress,
  DeckProgressListener,
  DeckTemplate,
  GeneratedDeck,
} from '../deck-generator.port'
import { PDF_MIME, PPTX_MIME } from '../decks.constants'
import { PresentonAccountsService } from './presenton-accounts.service'

/**
 * Generation is started and then polled, rather than awaited in one long request.
 *
 * The blocking endpoint exists and is simpler, but it reports nothing until it is finished,
 * and a deck now takes minutes: the generator writes slides in small batches with a pause
 * between them to stay inside the provider's per-minute request budget. Polling is the only
 * way to know a deck is moving, and it also stops us holding a multi-minute HTTP request open
 * through every proxy in between.
 */
const GENERATE_START_TIMEOUT_MS = 60 * 1000
const STATUS_TIMEOUT_MS = 15 * 1000
const POLL_INTERVAL_MS = 5 * 1000

/**
 * How long a task may go without finishing before we call it dead.
 *
 * This is the real generation ceiling, and it must be owned here rather than inherited from
 * some request timeout: the generator does its work in a background task, so a restart on its
 * side leaves a task row that is reachable, `pending`, and never going to advance again.
 * Nothing else would ever notice.
 */
const GENERATE_DEADLINE_MS = 10 * 60 * 1000

/**
 * The generator's progress prose, mapped to our own phases.
 *
 * Prefix-matched rather than compared: these strings are UI copy on the vendor's side and get
 * reworded, so anchoring on the whole sentence would silently stop matching. An unrecognised
 * message leaves the phase alone instead of guessing, which is why this returns null.
 */
export function phaseFor(message: string | null | undefined): DeckPhase | null {
  const m = (message ?? '').toLowerCase()
  if (!m) return null
  if (m.startsWith('queued')) return 'starting'
  if (m.startsWith('starting')) return 'starting'
  if (m.includes('outline')) return 'outline'
  if (m.includes('layout')) return 'layout'
  if (m.includes('asset') || m.includes('image')) return 'assets'
  if (m.includes('slide')) return 'slides'
  if (m.includes('completed')) return 'finishing'
  return null
}

interface AsyncTask {
  id: string
  status: 'pending' | 'completed' | 'error'
  message?: string | null
  error?: unknown
  data?: {
    created_slides?: number
    remaining_slides?: number
    presentation_id?: string
    path?: string
    edit_path?: string
  } | null
}
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

/**
 * A failed task's error payload, in the same words a failed request would have produced.
 *
 * Routed through describeProviderFailure whenever the payload carries a status code, so that
 * moving generation onto the async endpoint did not quietly change what a student reads for
 * the most common failure by far — the provider's 429.
 */
export function describeTaskError(task: { error?: unknown; message?: string | null }): string {
  const error = (task.error ?? {}) as Record<string, unknown>
  const status = error.status_code ?? error.status ?? error.code
  const numeric = typeof status === 'number' ? status : Number.parseInt(String(status ?? ''), 10)
  if (Number.isFinite(numeric)) return describeProviderFailure(numeric, JSON.stringify(error))

  for (const candidate of [error.detail, error.message, task.message]) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim().slice(0, 200)
    }
  }
  return 'The AI service returned an unexpected error.'
}

/**
 * The rows out of a template-list body, or null when the body is neither shape we know.
 *
 * Null rather than `[]` so the caller can tell "the instance offers no templates" apart from
 * "we could not read the response". Conflating the two is what hid the pagination wrapper.
 */
export function templateItems(body: unknown): unknown[] | null {
  if (Array.isArray(body)) return body
  const items = (body as { items?: unknown } | null)?.items
  return Array.isArray(items) ? items : null
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

  async generate(
    request: DeckGenerationRequest,
    onProgress?: DeckProgressListener,
  ): Promise<GeneratedDeck> {
    const { baseUrl } = this.credentials()
    const started = Date.now()
    const auth = await this.asOwner(request.ownerId)

    const res = await fetch(`${baseUrl}/api/v1/ppt/presentation/generate/async`, {
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
      // Only the handshake. The work itself is bounded by GENERATE_DEADLINE_MS below.
      signal: AbortSignal.timeout(GENERATE_START_TIMEOUT_MS),
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

    const task = (await res.json()) as AsyncTask
    if (!task?.id) {
      throw new InternalServerErrorException('Deck generation did not start')
    }

    const body = await this.awaitTask(baseUrl, auth, task, request, onProgress)
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

  /**
   * Polls a started generation to completion, reporting progress as it moves.
   *
   * Progress is reported only when it CHANGES. The generator commits a new count once per
   * batch — every ~35 seconds under the pacing it runs with — so most polls see nothing new,
   * and forwarding every one of them would mean a database write every five seconds for
   * minutes to say the same thing.
   */
  private async awaitTask(
    baseUrl: string,
    auth: Record<string, string>,
    initial: AsyncTask,
    request: DeckGenerationRequest,
    onProgress?: DeckProgressListener,
  ): Promise<GenerateResponse> {
    const deadline = Date.now() + GENERATE_DEADLINE_MS
    let lastPhase: DeckPhase = 'starting'
    let lastKey = ''

    const report = (task: AsyncTask) => {
      if (!onProgress) return
      const phase = phaseFor(task.message) ?? lastPhase
      lastPhase = phase
      const done = task.data?.created_slides ?? 0
      // The generator's own total, from the two halves it reports. Falling back to what we
      // asked for rather than to zero, so the UI is never told "4 of 0".
      const remaining = task.data?.remaining_slides ?? 0
      const total = done + remaining > 0 ? done + remaining : request.slideCount
      const key = `${phase}:${done}:${total}`
      if (key === lastKey) return
      lastKey = key
      onProgress({ phase, done, total } satisfies DeckProgress)
    }

    report(initial)

    for (;;) {
      if (Date.now() > deadline) {
        this.logger.warn(`generation task ${initial.id} exceeded its deadline`)
        // Worded as a stall rather than a timeout: the usual cause is the generator having
        // restarted mid-task, which leaves the task row alive and permanently pending.
        throw new InternalServerErrorException('The AI service stopped responding partway.')
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))

      const res = await fetch(
        `${baseUrl}/api/v1/ppt/presentation/status/${encodeURIComponent(initial.id)}`,
        { headers: auth, signal: AbortSignal.timeout(STATUS_TIMEOUT_MS) },
      )

      if (!res.ok) {
        // A single failed poll is not a failed deck — the work continues on the generator
        // regardless of whether we managed to ask about it. Only the deadline ends this loop.
        this.logger.warn(`status poll failed ${res.status} for task ${initial.id}`)
        continue
      }

      const task = (await res.json()) as AsyncTask
      report(task)

      if (task.status === 'error') throw new InternalServerErrorException(describeTaskError(task))

      if (task.status === 'completed') {
        return {
          presentation_id: task.data?.presentation_id ?? '',
          path: task.data?.path ?? '',
          edit_path: task.data?.edit_path ?? '',
        }
      }
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
    const body = await this.getJson<unknown>(
      baseUrl,
      { Authorization: `Bearer ${apiKey}` },
      '/api/v1/ppt/template/all?page_size=50&default=true',
    )

    // The endpoint is paginated: `{ items, total, page, page_size }`. This read the body as
    // an array and so returned nothing for every request, which left the create form's
    // picker empty and pinned every deck to `general` -- in silence, because an empty list
    // is indistinguishable from "nothing selected yet" in the UI. A bare array is still
    // accepted in case the shape changes back, but an unrecognised body now logs.
    const items = templateItems(body)
    if (items === null) {
      this.logger.warn('template list: unexpected response shape, offering no templates')
      return []
    }

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
