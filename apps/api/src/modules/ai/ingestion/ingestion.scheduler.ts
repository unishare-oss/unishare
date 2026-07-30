import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { IngestStatus } from '@/generated/prisma/client'
import { PrismaService } from '@/prisma/prisma.service'
import { CronLockService } from '@/common/cron-lock.service'
import { IngestionService } from './ingestion.service'
import { EmbeddingService } from '../embedding/embedding.service'

/**
 * A PROCESSING file older than this is presumed orphaned by a pod restart.
 *
 * Deliberately generous, because the cost of guessing too low is worse than guessing
 * too high: too low re-starts an ingestion that is merely slow, and the two runs race.
 * Too high just delays recovery of a genuinely dead job by one sweep interval.
 *
 * Measured 2026-07-30 against the real CPU-only Ollama: one 32-chunk batch of ~2000-char
 * chunks takes ~26s. Since embedding is CPU-bound, batches effectively serialise, so:
 *   40-page PDF   ~50 chunks   2 batches   ~45s
 *   200-page doc  ~250 chunks  8 batches   ~3.5 min
 * That measurement came from a container with NO CPU limit. The deployed Ollama requests
 * only 100m CPU and shares a node with production, so a contended node can be several
 * times slower. 15 minutes would have been inside the plausible range for a large
 * document under contention; 60 is not.
 *
 * A double-start is not corrupting even if this is still too low: replaceChunks runs in a
 * transaction and @@unique([fileId, chunkIndex]) blocks a partial overwrite, so the loser
 * fails and lands in FAILED. It is a confusing status, not data loss. The sweep logs
 * re-picks so that case is visible rather than silent.
 */
export const STUCK_AFTER_MS = 60 * 60 * 1000
/** Bounded so the first sweep after deploy cannot stampede Ollama with the whole backlog. */
export const SWEEP_BATCH_SIZE = 20
/**
 * Must exceed one sweep's worst-case duration, or a still-running holder loses the lock and
 * a second pod starts sweeping alongside it. SWEEP_BATCH_SIZE files at minutes each (see the
 * STUCK_AFTER_MS measurements above) puts the worst case well into tens of minutes.
 */
export const SWEEP_LOCK_TTL_MS = 30 * 60 * 1000
export const SWEEP_LOCK_KEY = 'cron-lock:ingestion-sweep'

@Injectable()
export class IngestionScheduler {
  private readonly logger = new Logger(IngestionScheduler.name)
  private running = false

  constructor(
    private readonly prisma: PrismaService,
    private readonly ingestion: IngestionService,
    private readonly embedding: EmbeddingService,
    private readonly cronLock: CronLockService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async sweep(): Promise<void> {
    if (!this.embedding.enabled) return

    // In-process guard: cheap, and covers the common case of one tick overrunning
    // into the next within a single pod. It is set before the first await on purpose --
    // acquireLock yields, and a tick arriving in that window would otherwise sail past
    // this check while the previous sweep was still waiting on Redis.
    if (this.running) return
    this.running = true

    // Cross-pod guard. Production runs api.replicas: 2 and ScheduleModule runs @Cron in
    // EVERY replica, so without this both pods select the same PENDING rows and ingest
    // them concurrently. The transaction plus @@unique([fileId, chunkIndex]) stop that
    // corrupting anything, but it duplicates the expensive work (~26s per 32-chunk
    // embedding batch) and leaves the losing pod's file in FAILED for no real reason.
    //
    // A plain SET NX with a TTL is sufficient here: the worst outcome from losing the
    // lock is that this pod skips a sweep, and another runs five minutes later. The TTL
    // is what makes a crashed holder recoverable, so it must exceed one sweep's worst
    // case (SWEEP_BATCH_SIZE files, each up to minutes of embedding).
    let acquired = false
    try {
      acquired = await this.acquireLock()
      if (!acquired) return

      const files = await this.prisma.file.findMany({
        where: {
          OR: [
            { ingestStatus: IngestStatus.PENDING },
            {
              ingestStatus: IngestStatus.PROCESSING,
              ingestStartedAt: { lt: new Date(Date.now() - STUCK_AFTER_MS) },
            },
          ],
        },
        select: { id: true, ingestStatus: true },
        take: SWEEP_BATCH_SIZE,
        orderBy: { createdAt: 'asc' },
      })

      if (files.length === 0) return
      // Log the re-picks separately: a PROCESSING row reappearing here means either a pod
      // restart (expected) or an ingestion slower than STUCK_AFTER_MS (a signal that the
      // threshold is too low for the documents being uploaded).
      const repicks = files.filter((f) => f.ingestStatus === IngestStatus.PROCESSING)
      this.logger.log(
        `Sweeping ${files.length} file(s) for ingestion` +
          (repicks.length > 0 ? `, ${repicks.length} re-picked from PROCESSING` : ''),
      )

      for (const file of files) {
        await this.ingestion.ingestFile(file.id)
      }
    } catch (err) {
      this.logger.warn(`Ingestion sweep failed: ${(err as Error).message}`)
    } finally {
      this.running = false
      // Must run on every exit path, including the zero-files early return: a lock that is
      // never released is worse than no lock, because it stops all sweeps for a full TTL.
      // Skipped when acquisition failed, so a sweep that lost the race cannot free the
      // winner's lock.
      if (acquired) await this.releaseLock()
    }
  }

  private async acquireLock(): Promise<boolean> {
    return this.cronLock.acquire(SWEEP_LOCK_KEY, SWEEP_LOCK_TTL_MS)
  }

  private async releaseLock(): Promise<void> {
    await this.cronLock.release(SWEEP_LOCK_KEY)
  }
}
