import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { CronLockService } from '@/common/cron-lock.service'
import { runWithCronLock } from '@/common/run-with-cron-lock'
import { TrendingService } from './trending.service'

/** Bare job name -- CronLockService owns the `cron-lock:` namespace. */
export const TRENDING_LOCK_KEY = 'trending-refresh'
/**
 * Four minutes, i.e. strictly under the five-minute cadence.
 *
 * This is the tightest TTL in the app because it is the only job whose cadence is measured in
 * minutes: a crashed holder must let go before the next tick, or one crash silently stops
 * trending scores updating. Four minutes costs at most a single skipped tick.
 *
 * The lower bound is a whole refresh -- one `findMany` over published posts plus one
 * `$transaction` of per-post updates -- which is seconds at this scale. Nothing here renews
 * the lease mid-run because the transaction is a single await with no point to renew from; if
 * a refresh ever did exceed four minutes the lock would expire and the other pod could join
 * in, which wastes work and adds row-lock contention but cannot corrupt anything (see below).
 */
export const TRENDING_LOCK_TTL_MS = 4 * 60 * 1000

/**
 * `refreshTrendingScores` is IDEMPOTENT: it recomputes every score from scratch and writes it
 * by absolute assignment, not increment. So the double-run this lock prevents was never
 * corrupting data -- it was doing the same full-table transaction twice every five minutes,
 * ~288 redundant passes a day, each one contending for row locks on every published post.
 * This is a wasted-work fix, and the highest-value one in the app by cadence alone.
 */
@Injectable()
export class TrendingScheduler implements OnModuleInit {
  private readonly logger = new Logger(TrendingScheduler.name)
  private running = false

  constructor(
    private readonly trendingService: TrendingService,
    private readonly cronLock: CronLockService,
  ) {}

  /**
   * Boot-time refresh, so a fresh deploy has scores immediately rather than waiting up to five
   * minutes for the first tick.
   *
   * Deliberately guarded by the SAME lock key as the cron, not left unlocked and not given a
   * key of its own. Two pods rolling out together boot within seconds of each other, which is
   * precisely when this double-fires -- and the reason it exists ("scores must exist now") is
   * satisfied by the other pod's refresh just as well as by this one, because scores are
   * global database state, not per-pod state. A boot that loses the race is therefore not a
   * skipped refresh; it is a refresh someone else is already doing. If it loses to an
   * in-flight cron tick instead, same conclusion.
   *
   * Ordering is safe: `TrendingModule` imports `CronLockModule`, so `CronLockService` is
   * initialised (and its Redis client created) before this runs. With Redis down, `acquire`
   * is fail-open, so bootstrap still refreshes.
   */
  async onModuleInit() {
    await this.refreshLocked()
  }

  /**
   * Refresh trending scores every 5 minutes.
   * Runs automatically when application starts.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleTrendingRefresh(): Promise<void> {
    try {
      await this.refreshLocked()
    } catch (error) {
      this.logger.error('[TrendingScheduler] Failed to refresh trending scores', error)
      // Don't re-throw: scheduler should continue running
    }
  }

  /**
   * The in-process flag is set before the first await on purpose: acquiring the lock yields,
   * and a tick arriving in that window would otherwise sail past the check while the previous
   * refresh was still waiting on Redis. It covers one pod overrunning its own cadence; the
   * lock covers the other pod.
   */
  private async refreshLocked(): Promise<void> {
    if (this.running) return
    this.running = true

    try {
      await runWithCronLock(
        this.cronLock,
        TRENDING_LOCK_KEY,
        TRENDING_LOCK_TTL_MS,
        this.logger,
        () => this.trendingService.refreshTrendingScores(),
      )
    } finally {
      this.running = false
    }
  }
}
