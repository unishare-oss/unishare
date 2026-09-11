import { Inject, Logger } from '@nestjs/common'
import { Processor, WorkerHost } from '@nestjs/bullmq'
import type { Job } from 'bullmq'
import { DECK_CONCURRENCY, DECK_QUEUE } from './decks.constants'
import { DECK_GENERATOR, type DeckGenerator, type DeckProgress } from './deck-generator.port'
import { DeckArtifactsService } from './deck-artifacts.service'
import { DecksService } from './decks.service'

export interface DeckJobData {
  deckId: string
}

/**
 * Local concurrency matches the global cap. The global limit is what actually bounds spend
 * (see decks.module.ts); this only stops a single worker from exceeding it on its own.
 */
@Processor(DECK_QUEUE, { concurrency: DECK_CONCURRENCY })
export class DecksProcessor extends WorkerHost {
  private readonly logger = new Logger(DecksProcessor.name)

  constructor(
    private readonly decks: DecksService,
    private readonly artifacts: DeckArtifactsService,
    @Inject(DECK_GENERATOR) private readonly generator: DeckGenerator,
  ) {
    super()
  }

  // Re-rendering lives on its own queue and in its own processor — see
  // decks-render.processor.ts. This one only ever generates.
  async process(job: Job<DeckJobData>): Promise<void> {
    return this.generate(job)
  }

  private async generate(job: Job<DeckJobData>): Promise<void> {
    const { deckId } = job.data
    const deck = await this.decks.findForJob(deckId)
    if (!deck) {
      // The row was deleted while queued. Nothing to write results to, so drop the job
      // rather than retrying into a permanent failure.
      this.logger.warn(`Deck ${deckId} vanished before generation; dropping job ${job.id}`)
      return
    }

    const attempt = job.attemptsMade + 1
    await this.decks.markGenerating(deckId, attempt)

    // Tracked outside the try so the catch can reach them. Generation uploads two objects and
    // creates a presentation on the generator before anything is recorded, so a failure in
    // between leaves all three unreferenced — and this scope is the only thing that knows them.
    const uploaded: (string | null)[] = []
    let externalId: string | null = null
    let recorded = false

    try {
      const generated = await this.generator.generate(
        {
          // The generator is multi-tenant: without this the deck is created under the shared
          // administrator account and never appears in the student's editor.
          ownerId: deck.ownerId,
          prompt: deck.prompt,
          slideCount: deck.slideCount,
          language: deck.language,
          template: deck.template,
          tone: deck.tone,
          verbosity: deck.verbosity,
          instructions: deck.instructions,
          includeTitleSlide: deck.includeTitleSlide,
          includeTableOfContents: deck.includeTableOfContents,
          webSearch: deck.webSearch,
        },
        (progress) => void this.publishProgress(deckId, progress),
      )

      externalId = generated.externalId

      const key = await this.artifacts.store(generated.pptx)
      uploaded.push(key)
      const pdfKey = generated.pdf ? await this.artifacts.store(generated.pdf) : null
      uploaded.push(pdfKey)

      const published = await this.decks.markReady(deckId, {
        key,
        pdfKey,
        sizeBytes: generated.pptx.buffer.byteLength,
        title: this.titleFor(deck.prompt),
        externalId: generated.externalId,
      })
      // Past this point the row references these keys and the presentation, so none of them
      // may be cleaned up by the catch below.
      recorded = published

      // Deleted while it was generating. The files were uploaded a moment ago and now belong
      // to nothing, so they are cleaned up here rather than left for a sweep — this is the
      // only place that still knows their keys.
      if (!published) {
        await this.artifacts.discard(
          deckId,
          uploaded,
          generated.externalId,
          deck.ownerId,
          'was deleted mid-generation',
        )
        return
      }
      this.logger.log(`Deck ${deckId} ready at ${key}${pdfKey ? ' (+pdf)' : ''}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const maxAttempts = job.opts.attempts ?? 1

      // Before the retry produces more. Nothing recorded this attempt's output, so the objects
      // are unreferenced and its generator presentation is unreachable — the row never learned
      // the externalId, so neither delete nor purge could ever find it. Without this, every
      // failed attempt left a full set behind, three times over on a deck that exhausts its
      // retries.
      if (!recorded) {
        await this.artifacts.discard(deckId, uploaded, externalId, deck.ownerId, 'attempt failed')
      }

      // Only the LAST attempt marks the deck failed. Marking it on every attempt made a deck
      // that BullMQ was still retrying look permanently dead, which is how a transient
      // provider error turned into a wasted quota slot.
      if (attempt >= maxAttempts) {
        await this.decks.markFailed(deckId, message)
        this.logger.error(`Deck ${deckId} failed after ${attempt} attempts: ${message}`)
      } else {
        await this.decks.markRetrying(deckId, attempt, message)
        this.logger.warn(
          `Deck ${deckId} attempt ${attempt}/${maxAttempts} failed, will retry: ${message}`,
        )
      }
      throw err
    }
  }

  /**
   * Progress is nice-to-have, so a failure to store it must never fail the deck.
   *
   * Not awaited by the caller either: the generator's poll loop should not stall behind a
   * database write, and a dropped update is corrected by the next one a few seconds later.
   */
  private async publishProgress(deckId: string, progress: DeckProgress): Promise<void> {
    try {
      await this.decks.recordProgress(deckId, progress)
    } catch (err) {
      this.logger.warn(`Deck ${deckId} progress update failed: ${String(err)}`)
    }
  }

  /**
   * Title comes from the student's own prompt, not the generator's filename. Predictable,
   * and it never surfaces details the model invented.
   */
  private titleFor(prompt: string): string {
    const firstLine = prompt.trim().split('\n')[0].trim()
    return firstLine.length > 120 ? `${firstLine.slice(0, 117)}...` : firstLine
  }
}
