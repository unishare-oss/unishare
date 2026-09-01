import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
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
import { DECK_EDITOR, type DeckEditor, type DeckSlide } from './deck-generator.port'
import { GENERATE_JOB, REEXPORT_JOB } from './decks.constants'
import {
  AVG_SECONDS_PER_SLIDE,
  DAILY_DECK_QUOTA,
  DECK_CONCURRENCY,
  DECK_QUEUE,
  DEFAULT_SLIDES,
  WAITING_SCAN_LIMIT,
} from './decks.constants'
import type { DeckEntity } from './entities/deck.entity'

/**
 * Quota window.
 *
 * A rolling 24 hours rather than a calendar day, for two reasons: it sidesteps the question of
 * whose midnight (the users are not in UTC), and it cannot be gamed by spending the whole
 * allowance at 23:59 and the next one at 00:01.
 */
const QUOTA_WINDOW_MS = 24 * 60 * 60 * 1000

@Injectable()
export class DecksService {
  private readonly logger = new Logger(DecksService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @InjectQueue(DECK_QUEUE) private readonly queue: Queue,
    @Inject(DECK_EDITOR) private readonly editor: DeckEditor,
  ) {}

  async createDeck(userId: string, dto: CreateDeckDto): Promise<DeckEntity> {
    const quota = await this.getQuota(userId)
    if (quota.used >= quota.limit) {
      // 429 rather than 403: the caller is not forbidden, only early. The frontend
      // distinguishes this from a queue wait, because waiting does not clear it.
      throw new HttpException(
        {
          message: `You have used all ${quota.limit} decks for today. Your allowance resets shortly.`,
          resetsAt: quota.resetsAt,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }

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
      },
    })

    const job = await this.queue.add(GENERATE_JOB, { deckId: deck.id })
    // The row exists before the job does, so a crash between the two leaves a deck stuck in
    // QUEUED with no jobId rather than an orphaned job with nothing to write results to.
    const withJob = await this.prisma.deck.update({
      where: { id: deck.id },
      data: { jobId: job.id ?? null },
    })

    return this.toEntity(withJob, 0, false)
  }

  async getDeck(id: string, userId: string): Promise<DeckEntity> {
    const deck = await this.prisma.deck.findUnique({ where: { id } })
    if (!deck) throw new NotFoundException('Deck not found')
    if (deck.ownerId !== userId) throw new ForbiddenException('Access denied')

    if (deck.status !== DeckStatus.QUEUED) return this.toEntity(deck, null, null)

    const { ahead, approximate } = await this.queuePosition(deck.jobId)
    return this.toEntity(deck, ahead, approximate)
  }

  async listDecks(userId: string, query: ListDecksDto) {
    const page = query.page ?? 1
    const limit = query.limit ?? 20
    const [rows, total] = await Promise.all([
      this.prisma.deck.findMany({
        where: { ownerId: userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.deck.count({ where: { ownerId: userId } }),
    ])
    return { data: rows.map((d) => this.toEntity(d, null, null)), total, page, limit }
  }

  async getDownloadUrl(id: string, userId: string, format: 'pptx' | 'pdf' = 'pptx') {
    const deck = await this.prisma.deck.findUnique({ where: { id } })
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
    return { url: await this.storage.generatePresignedDownloadUrl(key, expiresIn), expiresIn }
  }

  async getQuota(userId: string) {
    const since = new Date(Date.now() - QUOTA_WINDOW_MS)
    // Counts ATTEMPTS, including failures. A failed generation still spent model tokens most
    // of the time, and counting only successes would make retry-on-failure a free loop.
    const [used, oldest] = await Promise.all([
      this.prisma.deck.count({ where: { ownerId: userId, createdAt: { gte: since } } }),
      this.prisma.deck.findFirst({
        where: { ownerId: userId, createdAt: { gte: since } },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
    ])
    return {
      used,
      limit: DAILY_DECK_QUOTA,
      resetsAt: new Date((oldest?.createdAt.getTime() ?? Date.now()) + QUOTA_WINDOW_MS),
    }
  }

  // --- transitions called by the processor ------------------------------------------------

  markGenerating(deckId: string) {
    return this.prisma.deck.update({
      where: { id: deckId },
      data: { status: DeckStatus.GENERATING, startedAt: new Date() },
    })
  }

  markReady(
    deckId: string,
    data: {
      key: string
      pdfKey: string | null
      sizeBytes: number
      title: string
      externalId: string
    },
  ) {
    return this.prisma.deck.update({
      where: { id: deckId },
      data: {
        status: DeckStatus.READY,
        ...data,
        jobId: null,
        error: null,
        completedAt: new Date(),
      },
    })
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

  findForJob(deckId: string) {
    return this.prisma.deck.findUnique({ where: { id: deckId } })
  }

  // --- editing -----------------------------------------------------------------------------

  listTemplates() {
    return this.editor.listTemplates()
  }

  async getSlides(deckId: string, userId: string): Promise<DeckSlide[]> {
    const deck = await this.ownedEditableDeck(deckId, userId)
    return this.editor.getSlides(deck.externalId)
  }

  async updateSlide(deckId: string, userId: string, slideId: string, content: unknown) {
    const deck = await this.ownedEditableDeck(deckId, userId)
    const slides = await this.editor.getSlides(deck.externalId)
    const slide = slides.find((s) => s.id === slideId)
    if (!slide) throw new NotFoundException('Slide not found')

    // Re-fetched rather than trusted from the client: the update sends the WHOLE slide back,
    // so accepting a client-supplied `raw` would let a stale or crafted payload overwrite
    // fields the editor never showed.
    await this.editor.updateSlide({ ...slide, content })
  }

  async aiEditSlide(deckId: string, userId: string, slideId: string, prompt: string) {
    const deck = await this.ownedEditableDeck(deckId, userId)
    const slides = await this.editor.getSlides(deck.externalId)
    if (!slides.some((s) => s.id === slideId)) throw new NotFoundException('Slide not found')
    await this.editor.aiEditSlide(slideId, prompt)
  }

  /**
   * Queues a re-render so the stored PPTX/PDF catch up with edited slides.
   *
   * Explicit rather than automatic on every edit: a re-render per keystroke-batch would be
   * wasteful, and the student is better served by deciding when they are done.
   */
  async requestReexport(deckId: string, userId: string) {
    const deck = await this.ownedEditableDeck(deckId, userId)
    const job = await this.queue.add(REEXPORT_JOB, { deckId })
    return this.prisma.deck.update({
      where: { id: deck.id },
      data: { status: DeckStatus.GENERATING, jobId: job.id ?? null, error: null },
    })
  }

  async markReexported(
    deckId: string,
    data: { key: string; pdfKey: string | null; sizeBytes: number },
  ) {
    return this.prisma.deck.update({
      where: { id: deckId },
      data: { status: DeckStatus.READY, ...data, jobId: null, completedAt: new Date() },
    })
  }

  /** A deck the caller owns which the generator can still act on. */
  private async ownedEditableDeck(deckId: string, userId: string) {
    const deck = await this.prisma.deck.findUnique({ where: { id: deckId } })
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
   * Where this job sits in the waiting list.
   *
   * `getWaiting` returns FIFO order, so the index IS the number ahead — which holds only
   * while the queue stays FIFO. Adding job priorities would let a position climb while a
   * student watches it, which reads as broken even when it is correct.
   */
  private async queuePosition(
    jobId: string | null,
  ): Promise<{ ahead: number; approximate: boolean }> {
    if (!jobId) return { ahead: 0, approximate: false }
    try {
      const waiting = await this.queue.getWaiting(0, WAITING_SCAN_LIMIT - 1)
      const idx = waiting.findIndex((j) => j.id === jobId)
      if (idx >= 0) return { ahead: idx, approximate: false }
      // Not in the scanned window: either it just became active (nothing ahead), or the
      // queue is deeper than we are willing to scan.
      if (waiting.length >= WAITING_SCAN_LIMIT) {
        return { ahead: WAITING_SCAN_LIMIT, approximate: true }
      }
      return { ahead: 0, approximate: false }
    } catch (err) {
      // A queue lookup failing must not take the status endpoint down with it.
      this.logger.warn(`Queue position lookup failed for job ${jobId}: ${String(err)}`)
      return { ahead: 0, approximate: true }
    }
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
      tone: deck.tone,
      verbosity: deck.verbosity,
    }
  }
}
