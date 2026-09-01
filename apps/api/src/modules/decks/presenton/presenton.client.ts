import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { DeckGenerator, DeckGenerationRequest, GeneratedDeck } from '../deck-generator.port'
import { PPTX_MIME } from '../decks.constants'

/**
 * Generation is a single blocking request that returns only once the deck is finished —
 * measured at ~57s for 3 slides and ~114s for 8. Every default HTTP timeout in the ecosystem
 * is shorter than that, so the ceiling here is deliberate and generous; a job that genuinely
 * hangs is caught by the queue's own timeout, not by this.
 */
const GENERATE_TIMEOUT_MS = 10 * 60 * 1000
const DOWNLOAD_TIMEOUT_MS = 2 * 60 * 1000

interface GenerateResponse {
  presentation_id: string
  /** Server-absolute path to the exported file. Fetched by prepending the base URL verbatim. */
  path: string
  edit_path: string
}

@Injectable()
export class PresentonClient implements DeckGenerator {
  private readonly logger = new Logger(PresentonClient.name)
  constructor(private readonly config: ConfigService) {}

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

  async generate(request: DeckGenerationRequest): Promise<GeneratedDeck> {
    const { baseUrl, apiKey } = this.credentials()
    const started = Date.now()

    const res = await fetch(`${baseUrl}/api/v1/ppt/presentation/generate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: request.prompt,
        n_slides: request.slideCount,
        language: request.language,
        template: request.template,
        export_as: 'pptx',
      }),
      signal: AbortSignal.timeout(GENERATE_TIMEOUT_MS),
    })

    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 500)
      throw new InternalServerErrorException(
        `Deck generation failed (${res.status}): ${detail || 'no response body'}`,
      )
    }

    const body = (await res.json()) as GenerateResponse
    if (!body?.path || !body?.presentation_id) {
      throw new InternalServerErrorException('Deck generation returned no file path')
    }

    // The path is server-absolute and is served as-is; the /static and prefix-stripped
    // variants both 404, so do not be tempted to normalise it.
    const fileUrl = `${baseUrl}${body.path}`
    const file = await fetch(fileUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    })

    if (!file.ok) {
      throw new InternalServerErrorException(
        `Deck generated but could not be downloaded (${file.status})`,
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    this.logger.log(
      `Generated deck ${body.presentation_id}: ${request.slideCount} slides, ` +
        `${buffer.byteLength} bytes, ${((Date.now() - started) / 1000).toFixed(1)}s`,
    )

    return {
      externalId: body.presentation_id,
      buffer,
      // Trust our own export request over a Content-Type header we did not set.
      mimeType: PPTX_MIME,
      filename: decodeURIComponent(body.path.split('/').pop() ?? 'deck.pptx'),
    }
  }
}
