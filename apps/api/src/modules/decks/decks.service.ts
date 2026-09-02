import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import { PrismaService } from '@/prisma/prisma.service'
import { StorageService } from '@/modules/storage/storage.service'
import { DeckStatus, type Deck } from '@/generated/prisma/client'
import type { CreateDeckDto, ListDecksDto } from './dto'
import { DECK_EDITOR, type DeckEditor } from './deck-generator.port'
import {
  AVG_SECONDS_PER_SLIDE,
  DAILY_DECK_QUOTA,
  DECK_CONCURRENCY,
  DECK_QUEUE,
  DECK_RENDER_QUEUE,
  DEFAULT_SLIDES,
  GENERATE_JOB,
  MAX_ATTEMPTS,
  QUOTA_WINDOW_MS,
  REEXPORT_JOB,
  RETRY_BACKOFF_MS,
  WAITING_SCAN_LIMIT,
} from './decks.constants'
import type { DeckEntity } from './entities/deck.entity'

@Injectable()
export class DecksService {
  private readonly logger = new Logger(DecksService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @InjectQueue(DECK_QUEUE) private readonly queue: Queue,
    // Separate queue on purpose: a render is on the critical path of a download and must not
    // wait behind a multi-minute generation. See DECK_RENDER_QUEUE.
    @InjectQueue(DECK_RENDER_QUEUE) private readonly renderQueue: Queue,
    @Inject(DECK_EDITOR) private readonly editor: DeckEditor,
  ) {}

  async createDeck(userId: string, dto: CreateDeckDto): Promise<DeckEntity> {
    const quota = await this.getQuota(userId)

    // Over quota does NOT mean refused. The deck is accepted and held until the student's
    // allowance frees up, because losing the request is worse than waiting for it: they have
    // already written the prompt, and a 429 makes them come back and retype it.
    const scheduledFor = quota.used >= quota.limit ? quota.nextSlotAt : null

    const deck = await this.prisma.deck.create({
      data: {
        ownerId: userId,
        prompt: dto.prompt,
        slideCount: dto.slideCount ?? DEFAULT_SLIDES,
        language: dto.language ?? 'English',
        template: dto.template ?? 'general',
        tone: dto.tone ?? 'default',
        verbosity: dto.verbosity ?? 'standard',
        instructions: dto.instructions ?? null,
        includeTitleSlide: dto.includeTitleSlide ?? true,
        includeTableOfContents: dto.includeTableOfContents ?? false,
        webSearch: dto.webSearch ?? false,
        status: DeckStatus.QUEUED,
        scheduledFor,
      },
    })

    const job = await this.queue.add(
      GENERATE_JOB,
      { deckId: deck.id },
      {
        attempts: MAX_ATTEMPTS,
        backoff: { type: 'exponential', delay: RETRY_BACKOFF_MS },
        ...(scheduledFor ? { delay: Math.max(0, scheduledFor.getTime() - Date.now()) } : {}),
      },
    )
    // The row exists before the job does, so a crash between the two leaves a deck stuck in
    // QUEUED with no jobId rather than an orphaned job with nothing to write results to.
    const withJob = await this.prisma.deck.update({
      where: { id: deck.id },
      data: { jobId: job.id ?? null },
    })

    return this.toEntity(withJob, scheduledFor ? null : 0, false)
  }

  async getDeck(id: string, userId: string): Promise<DeckEntity> {
    const deck = await this.prisma.deck.findFirst({ where: { id, deletedAt: null } })
    if (!deck) throw new NotFoundException('Deck not found')
    if (deck.ownerId !== userId) throw new ForbiddenException('Access denied')

    const needsPosition =
      deck.status === DeckStatus.QUEUED &&
      !(deck.scheduledFor && deck.scheduledFor.getTime() > Date.now())
    const snapshot = needsPosition ? await this.waitingSnapshot() : null
    const { ahead, approximate } = this.positionFor(deck, snapshot)
    return this.toEntity(deck, ahead, approximate)
  }

  async listDecks(userId: string, query: ListDecksDto) {
    const page = query.page ?? 1
    const limit = query.limit ?? 20
    const [rows, total] = await Promise.all([
      this.prisma.deck.findMany({
        where: { ownerId: userId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.deck.count({ where: { ownerId: userId, deletedAt: null } }),
    ])
    // One queue read for the page. Without this the library could only say "waiting",
    // while the deck page said "3 ahead" — the same deck describing itself two ways.
    const anyQueued = rows.some(
      (d) =>
        d.status === DeckStatus.QUEUED &&
        !(d.scheduledFor && d.scheduledFor.getTime() > Date.now()),
    )
    const snapshot = anyQueued ? await this.waitingSnapshot() : null

    return {
      data: rows.map((d) => {
        const { ahead, approximate } = this.positionFor(d, snapshot)
        return this.toEntity(d, ahead, approximate)
      }),
      total,
      page,
      limit,
    }
  }

  async getDownloadUrl(id: string, userId: string, format: 'pptx' | 'pdf' = 'pptx') {
    const deck = await this.prisma.deck.findFirst({ where: { id, deletedAt: null } })
    if (!deck) throw new NotFoundException('Deck not found')
    if (deck.ownerId !== userId) throw new ForbiddenException('Access denied')

    const key = format === 'pdf' ? deck.pdfKey : deck.key
    if (!key) {
      // A missing PDF is not the same as a missing deck: the PPTX may be fine while the
      // preview render failed, and the message should say which.
      throw new NotFoundException(
        format === 'pdf' ? 'No preview available for this deck' : 'Deck is not ready yet',
      )
    }
    const expiresIn = 3600
    // A real filename, not the generated object key. Without it the browser saves
    // `1788334762320-50b9c4b64ecc3706.pptx`, which is both unhelpful to a student handing
    // work in and enough to make PowerPoint reject an otherwise valid package.
    const filename = `${deck.title ?? 'deck'}.${format}`
    return {
      url: await this.storage.generatePresignedDownloadUrl(key, expiresIn, filename),
      expiresIn,
    }
  }

  /**
   * Soft delete: the row stays, the deck goes.
   *
   * Hard-deleting would hand the allowance back, and "delete and regenerate" is then an
   * unlimited quota. Keeping the row costs a few hundred bytes and makes the limit mean what
   * it says. The trade the student sees is that deleting a deck does not buy them another —
   * which is why the UI says so before they confirm.
   */
  async deleteDeck(id: string, userId: string): Promise<void> {
    const deck = await this.prisma.deck.findFirst({ where: { id, deletedAt: null } })
    if (!deck) throw new NotFoundException('Deck not found')
    if (deck.ownerId !== userId) throw new ForbiddenException('Access denied')

    // Recorded first, on its own. The list has to update now, and neither a slow generator
    // nor an unreachable object store is allowed to fail a student's delete.
    await this.prisma.deck.update({ where: { id }, data: { deletedAt: new Date() } })

    // Everything below reclaims space and cannot undo the line above, so each part is
    // best-effort and logged. A failure leaves key/pdfKey in place, which is the record of
    // what was orphaned — losing the reference would make the leak unfindable.
    if (deck.jobId) await this.discardJob(deck.jobId, id)
    await this.purgeArtifacts(deck)
    this.logger.log(`Deck ${id} deleted by ${userId}`)
  }

  /**
   * Drops a queued job so a deleted deck never starts generating.
   *
   * Not the real guard, and not able to be: a job the worker already holds cannot be
   * cancelled, and one inside a ten-minute generate call least of all. findForJob and the
   * deletedAt-scoped result writes are what actually make deletion stick — this only avoids
   * spending a provider call on work whose result has nowhere to go.
   */
  private async discardJob(jobId: string, deckId: string) {
    try {
      const job = await this.queue.getJob(jobId)
      await job?.remove()
    } catch (err) {
      this.logger.warn(`Could not remove job ${jobId} for deleted deck ${deckId}: ${String(err)}`)
    }
  }

  /** The stored files and the generator's own copy. Failures are leaks, not errors. */
  private async purgeArtifacts(
    deck: Pick<Deck, 'id' | 'ownerId' | 'key' | 'pdfKey' | 'externalId'>,
  ) {
    const keys = [deck.key, deck.pdfKey].filter((k): k is string => Boolean(k))
    await Promise.all(
      keys.map((key) =>
        this.storage
          .deleteFile(key)
          .catch((err) => this.logger.warn(`Orphaned object ${key}: ${String(err)}`)),
      ),
    )
    // Contractually never throws — see DeckEditor.deletePresentation.
    if (deck.externalId) await this.editor.deletePresentation(deck.externalId, deck.ownerId)
  }

  async getQuota(userId: string) {
    const since = new Date(Date.now() - QUOTA_WINDOW_MS)

    // Failures are excluded on purpose. A deck that errored produced nothing, and with
    // retries in place a genuine failure means all attempts were exhausted — that is our
    // problem, not the student's allowance.
    //
    // Deleted decks are NOT excluded, and this is the one query in the file that ignores
    // deletedAt. A deck that was generated was paid for; letting a delete refund it turns
    // the daily limit into a suggestion. Do not "fix" this by adding the filter.
    const inWindow = await this.prisma.deck.findMany({
      where: {
        ownerId: userId,
        status: { not: DeckStatus.FAILED },
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    })

    const used = inWindow.length
    const limit = DAILY_DECK_QUOTA

    // When the next slot frees for the request being made right now. With `used` decks in
    // the window and a limit of `limit`, the next request waits for the (used - limit)th
    // oldest to age out — which correctly stacks when several are already held.
    const index = used - limit
    const nextSlotAt =
      index >= 0 && inWindow[index]
        ? new Date(inWindow[index].createdAt.getTime() + QUOTA_WINDOW_MS)
        : null

    return {
      used,
      limit,
      nextSlotAt,
      resetsAt: new Date((inWindow[0]?.createdAt.getTime() ?? Date.now()) + QUOTA_WINDOW_MS),
    }
  }

  // --- transitions called by the processor ------------------------------------------------

  markGenerating(deckId: string, attempt: number) {
    return this.prisma.deck.update({
      where: { id: deckId },
      data: {
        status: DeckStatus.GENERATING,
        startedAt: new Date(),
        attempts: attempt,
        scheduledFor: null,
      },
    })
  }

  /**
   * An attempt failed but more remain. Status goes back to QUEUED rather than FAILED so the
   * deck reads as "still trying" — the error is kept so the UI can say what went wrong
   * without claiming the deck is dead.
   */
  markRetrying(deckId: string, attempts: number, error: string) {
    return this.prisma.deck.update({
      where: { id: deckId },
      data: { status: DeckStatus.QUEUED, attempts, error: error.slice(0, 500) },
    })
  }

  /**
   * Publishes a finished deck, unless it was deleted while it was being made.
   *
   * Scoped on deletedAt and returning whether it applied, because generation takes minutes
   * and a student can delete a deck in the middle of one. Writing the result unconditionally
   * would resurrect the row with a key pointing at files nobody can ever reach — the caller
   * uses the false to clean those up instead.
   */
  async markReady(
    deckId: string,
    data: {
      key: string
      pdfKey: string | null
      sizeBytes: number
      title: string
      externalId: string
    },
  ): Promise<boolean> {
    const { count } = await this.prisma.deck.updateMany({
      where: { id: deckId, deletedAt: null },
      data: {
        status: DeckStatus.READY,
        ...data,
        jobId: null,
        error: null,
        completedAt: new Date(),
      },
    })
    return count > 0
  }

  markFailed(deckId: string, error: string) {
    return this.prisma.deck.update({
      where: { id: deckId },
      data: {
        status: DeckStatus.FAILED,
        error: error.slice(0, 500),
        jobId: null,
        completedAt: new Date(),
      },
    })
  }

  /**
   * The worker's view of a deck. Filtered on deletedAt because deleting a deck mid-flight
   * must stop the work: the processor treats a missing row as "drop this job", so a deck
   * deleted while queued never starts.
   */
  findForJob(deckId: string) {
    return this.prisma.deck.findFirst({ where: { id: deckId, deletedAt: null } })
  }

  // --- editing -----------------------------------------------------------------------------

  listTemplates() {
    return this.editor.listTemplates()
  }

  /**
   * Queues a re-render so the stored PPTX/PDF catch up with edited slides.
   *
   * Explicit rather than automatic on every edit: a re-render per keystroke-batch would be
   * wasteful, and the student is better served by deciding when they are done.
   */
  async requestReexport(deckId: string, userId: string) {
    const deck = await this.ownedEditableDeck(deckId, userId)
    const job = await this.renderQueue.add(REEXPORT_JOB, { deckId })
    return this.prisma.deck.update({
      where: { id: deck.id },
      data: { status: DeckStatus.GENERATING, jobId: job.id ?? null, error: null },
    })
  }

  /** As markReady: a re-render that finishes after a delete must not republish the deck. */
  async markReexported(
    deckId: string,
    data: { key: string; pdfKey: string | null; sizeBytes: number },
  ): Promise<boolean> {
    const { count } = await this.prisma.deck.updateMany({
      where: { id: deckId, deletedAt: null },
      data: { status: DeckStatus.READY, ...data, jobId: null, completedAt: new Date() },
    })
    return count > 0
  }

  /** A deck the caller owns which the generator can still act on. */
  private async ownedEditableDeck(deckId: string, userId: string) {
    const deck = await this.prisma.deck.findFirst({ where: { id: deckId, deletedAt: null } })
    if (!deck) throw new NotFoundException('Deck not found')
    if (deck.ownerId !== userId) throw new ForbiddenException('Access denied')
    if (!deck.externalId) {
      // Decks generated before externalId was stored, or one that never finished.
      throw new BadRequestException('This deck cannot be edited')
    }
    return { ...deck, externalId: deck.externalId }
  }

  // --- internals ---------------------------------------------------------------------------

  /**
   * One read of the waiting list, answering for many jobs.
   *
   * `getWaiting` returns FIFO order, so a job's index IS the number ahead of it — which holds
   * only while the queue stays FIFO. Adding job priorities would let a position climb while a
   * student watches it, which reads as broken even when it is correct.
   *
   * Taken once per request rather than once per deck: a 30-deck library page would otherwise
   * make 30 identical Redis round-trips to build one screen.
   */
  private async waitingSnapshot(): Promise<{
    index: Map<string, number>
    truncated: boolean
  } | null> {
    try {
      const waiting = await this.queue.getWaiting(0, WAITING_SCAN_LIMIT - 1)
      const index = new Map<string, number>()
      waiting.forEach((job, i) => {
        if (job.id) index.set(job.id, i)
      })
      return { index, truncated: waiting.length >= WAITING_SCAN_LIMIT }
    } catch (err) {
      // A queue lookup failing must not take the deck endpoints down with it.
      this.logger.warn(`Queue position lookup failed: ${String(err)}`)
      return null
    }
  }

  /**
   * Position for one deck, given a snapshot. Returns nulls when the deck is not in a
   * countable line — finished, or held on quota, where the wait is a clock and any number
   * would be a fiction.
   */
  private positionFor(
    deck: Deck,
    snapshot: { index: Map<string, number>; truncated: boolean } | null,
  ): { ahead: number | null; approximate: boolean | null } {
    if (deck.status !== DeckStatus.QUEUED) return { ahead: null, approximate: null }
    if (deck.scheduledFor && deck.scheduledFor.getTime() > Date.now()) {
      return { ahead: null, approximate: null }
    }
    if (!snapshot) return { ahead: 0, approximate: true }

    const idx = deck.jobId ? snapshot.index.get(deck.jobId) : undefined
    if (idx !== undefined) return { ahead: idx, approximate: false }
    // Not in the scanned window: either it just became active (nothing ahead), or the queue
    // is deeper than we are willing to scan.
    if (snapshot.truncated) return { ahead: WAITING_SCAN_LIMIT, approximate: true }
    return { ahead: 0, approximate: false }
  }

  private toEntity(deck: Deck, ahead: number | null, approximate: boolean | null): DeckEntity {
    const ownSeconds = deck.slideCount * AVG_SECONDS_PER_SLIDE
    const etaSeconds =
      ahead === null
        ? null
        : Math.ceil(ahead / DECK_CONCURRENCY) * DEFAULT_SLIDES * AVG_SECONDS_PER_SLIDE + ownSeconds

    return {
      id: deck.id,
      status: deck.status,
      prompt: deck.prompt,
      title: deck.title,
      slideCount: deck.slideCount,
      language: deck.language,
      template: deck.template,
      error: deck.error,
      createdAt: deck.createdAt,
      completedAt: deck.completedAt,
      queueAhead: ahead,
      etaSeconds,
      queueAheadIsApproximate: approximate,
      hasPdf: Boolean(deck.pdfKey),
      canEdit: Boolean(deck.externalId),
      editorUrl: deck.externalId ? this.editor.editorUrlFor(deck.externalId) : null,
      tone: deck.tone,
      verbosity: deck.verbosity,
      // Distinguishes "waiting for your allowance" (a clock) from "waiting for a worker"
      // (a line). Conflating them is what made the old 429 feel like a dead end.
      scheduledFor: deck.scheduledFor,
      attempts: deck.attempts,
      maxAttempts: MAX_ATTEMPTS,
    }
  }
}
