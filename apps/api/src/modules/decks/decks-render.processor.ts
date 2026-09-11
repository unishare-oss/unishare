import { Inject, Logger } from '@nestjs/common'
import { Processor, WorkerHost } from '@nestjs/bullmq'
import type { Job } from 'bullmq'
import { DECK_RENDER_QUEUE, RENDER_CONCURRENCY } from './decks.constants'
import { DECK_EDITOR, type DeckEditor } from './deck-generator.port'
import { DeckArtifactsService } from './deck-artifacts.service'
import { DecksService } from './decks.service'
import type { DeckJobData } from './decks.processor'

/**
 * Re-rendering, on its own queue.
 *
 * Split from generation because a render is now on the critical path of a download: every
 * download re-renders first so that "download" always means the deck as it currently is. On
 * the shared queue a student waiting for a file would sit behind someone else's generation —
 * a model call measured in minutes, deliberately limited to one at a time to bound spend.
 *
 * A render costs no tokens, so it needs none of that restraint; it only needs to not wait.
 */
@Processor(DECK_RENDER_QUEUE, { concurrency: RENDER_CONCURRENCY })
export class DecksRenderProcessor extends WorkerHost {
  private readonly logger = new Logger(DecksRenderProcessor.name)

  constructor(
    private readonly decks: DecksService,
    private readonly artifacts: DeckArtifactsService,
    @Inject(DECK_EDITOR) private readonly editor: DeckEditor,
  ) {
    super()
  }

  async process(job: Job<DeckJobData>): Promise<void> {
    const { deckId } = job.data
    const deck = await this.decks.findForJob(deckId)
    if (!deck?.externalId) {
      // Deleted while queued, or never carried a generator id. Dropping the job beats
      // retrying into a permanent failure.
      this.logger.warn(`Deck ${deckId} has no external id; dropping re-render`)
      return
    }

    try {
      const { pptx, pdf } = await this.editor.reexport(deck.externalId, deck.ownerId)
      const key = await this.artifacts.store(pptx)
      const pdfKey = pdf ? await this.artifacts.store(pdf) : null

      const published = await this.decks.markReexported(deckId, {
        key,
        pdfKey,
        sizeBytes: pptx.buffer.byteLength,
      })
      if (!published) {
        await this.artifacts.discardOrphans(deckId, [key, pdfKey], deck.externalId, deck.ownerId)
        return
      }
      this.logger.log(`Deck ${deckId} re-rendered`)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await this.decks.markFailed(deckId, message)
      this.logger.error(`Deck ${deckId} re-render failed: ${message}`)
      throw err
    }
  }
}
