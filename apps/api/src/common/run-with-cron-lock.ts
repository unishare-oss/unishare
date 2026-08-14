import { Logger } from '@nestjs/common'
import { CronLock } from './cron-lock.service'

/**
 * Runs `job` at most once per tick across the whole deployment.
 *
 * Production runs `api.replicas: 2` and `ScheduleModule` registers `@Cron` handlers in EVERY
 * replica, so every scheduled job in this app fires once per pod per tick. An in-process
 * boolean cannot see the other pod; this can.
 *
 * Extracted rather than copy-pasted into each scheduler because the two subtleties below are
 * exactly the kind that drift when duplicated seven times:
 *
 *  - the early return happens BEFORE the `try`, so a caller that lost the race can never reach
 *    `release` and free the winner's lock. `CronLockService.release` is owner-gated as well, so
 *    this is belt-and-braces -- but the call itself should not happen.
 *  - `release` runs in `finally` and swallows its own rejection. Without the catch, a Redis
 *    blip during release would replace the job's real error, or escape a `@Cron` handler as an
 *    unhandled rejection with nothing left to catch it.
 *
 * Errors from `job` are deliberately NOT swallowed: callers differ (the tasks jobs let them
 * propagate today, `TrendingScheduler` catches its own) and this helper changes WHEN a job
 * runs, never WHAT it does.
 *
 * Note there is no `renew` here, unlike `IngestionScheduler`. Renewal exists there because a
 * ~70-minute worst-case sweep cannot fit under a TTL that must stay below the 60-minute
 * staleness threshold. No caller here has that conflict: for a job whose cadence is an hour or
 * a day, the lock only has to survive the moment both pods fire on the same tick, and a TTL
 * expiring mid-run is inert because the other pod is not due back for another cadence.
 *
 * @param key Bare job name -- `CronLockService` owns the `cron-lock:` namespace.
 */
export async function runWithCronLock(
  lock: CronLock,
  key: string,
  ttlMs: number,
  logger: Logger,
  job: () => Promise<void>,
): Promise<void> {
  const acquired = await lock.acquire(key, ttlMs)
  if (!acquired) {
    logger.debug(`Skipping ${key}: another replica holds the lock`)
    return
  }

  try {
    await job()
  } finally {
    // A lock that is never released is worse than no lock at all: nothing errors, and the job
    // is silently disabled until the TTL expires.
    await lock
      .release(key)
      .catch((err: Error) => logger.error(`Lock release failed for ${key}: ${err.message}`))
  }
}
