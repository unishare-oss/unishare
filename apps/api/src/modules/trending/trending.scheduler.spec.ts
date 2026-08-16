import { Test, TestingModule } from '@nestjs/testing'
import { CronLockService } from '@/common/cron-lock.service'
import { TrendingScheduler, TRENDING_LOCK_KEY, TRENDING_LOCK_TTL_MS } from './trending.scheduler'
import { TrendingService } from './trending.service'

/** Lets an in-flight refresh run to its next real await (the lock, then the service call). */
const flush = () => new Promise((resolve) => setImmediate(resolve))

describe('TrendingScheduler', () => {
  let scheduler: TrendingScheduler
  let trendingMock: { refreshTrendingScores: jest.Mock }
  let cronLockMock: { acquire: jest.Mock; release: jest.Mock; renew: jest.Mock }

  beforeEach(async () => {
    trendingMock = { refreshTrendingScores: jest.fn().mockResolvedValue(undefined) }
    cronLockMock = {
      acquire: jest.fn().mockResolvedValue(true),
      release: jest.fn().mockResolvedValue(undefined),
      renew: jest.fn().mockResolvedValue(undefined),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrendingScheduler,
        { provide: TrendingService, useValue: trendingMock },
        { provide: CronLockService, useValue: cronLockMock },
      ],
    }).compile()

    scheduler = module.get(TrendingScheduler)
  })

  describe('cron refresh', () => {
    it('refreshes and releases the lock when it is acquired', async () => {
      await scheduler.handleTrendingRefresh()

      expect(cronLockMock.acquire).toHaveBeenCalledWith(TRENDING_LOCK_KEY, TRENDING_LOCK_TTL_MS)
      expect(trendingMock.refreshTrendingScores).toHaveBeenCalledTimes(1)
      expect(cronLockMock.release).toHaveBeenCalledWith(TRENDING_LOCK_KEY)
    })

    // The headline fix: a 5-minute cadence means the unlocked version did this full-table
    // transaction ~288 redundant times a day. Idempotent, so wasteful rather than corrupting.
    it('does NOT refresh when another replica holds the lock', async () => {
      cronLockMock.acquire.mockResolvedValue(false)
      await scheduler.handleTrendingRefresh()

      expect(trendingMock.refreshTrendingScores).not.toHaveBeenCalled()
    })

    it('does NOT release a lock it never held', async () => {
      cronLockMock.acquire.mockResolvedValue(false)
      await scheduler.handleTrendingRefresh()

      expect(cronLockMock.release).not.toHaveBeenCalled()
    })

    // A leaked lock stops trending scores updating on every replica for a full TTL, and
    // nothing errors while that happens.
    it('releases the lock even when the refresh throws', async () => {
      trendingMock.refreshTrendingScores.mockRejectedValue(new Error('db down'))
      await scheduler.handleTrendingRefresh()

      expect(cronLockMock.release).toHaveBeenCalledWith(TRENDING_LOCK_KEY)
    })

    // Pre-existing contract: the handler swallows its own errors so the scheduler keeps
    // running. Wrapping it in a lock must not change that.
    it('does not reject when the refresh throws', async () => {
      trendingMock.refreshTrendingScores.mockRejectedValue(new Error('db down'))
      await expect(scheduler.handleTrendingRefresh()).resolves.toBeUndefined()
    })

    it('does not reject when releasing the lock fails', async () => {
      cronLockMock.release.mockRejectedValue(new Error('redis gone'))
      await expect(scheduler.handleTrendingRefresh()).resolves.toBeUndefined()
    })

    it('keeps refreshing on later ticks after a failed one', async () => {
      trendingMock.refreshTrendingScores.mockRejectedValueOnce(new Error('db down'))
      await scheduler.handleTrendingRefresh()
      await scheduler.handleTrendingRefresh()

      expect(trendingMock.refreshTrendingScores).toHaveBeenCalledTimes(2)
    })
  })

  // Pins why `running` is set before the first await rather than after acquiring the lock: a
  // tick arriving while the previous refresh is still waiting on Redis would otherwise sail
  // past the guard and start a second refresh inside the same pod.
  describe('in-process overrun guard', () => {
    it('does not start a second refresh while one is still running', async () => {
      let finish: () => void = () => {}
      trendingMock.refreshTrendingScores.mockImplementation(
        () => new Promise<void>((resolve) => (finish = resolve)),
      )

      const first = scheduler.handleTrendingRefresh()
      await flush()
      expect(trendingMock.refreshTrendingScores).toHaveBeenCalledTimes(1)

      await scheduler.handleTrendingRefresh()
      expect(trendingMock.refreshTrendingScores).toHaveBeenCalledTimes(1)

      finish()
      await first
    })

    it('does not start a second refresh that ticks during the first lock acquisition', async () => {
      let grantLock: (acquired: boolean) => void = () => {}
      cronLockMock.acquire.mockImplementation(
        () => new Promise((resolve) => (grantLock = resolve as (acquired: boolean) => void)),
      )

      const first = scheduler.handleTrendingRefresh()
      const second = scheduler.handleTrendingRefresh()

      grantLock(true)
      await Promise.all([first, second])

      expect(cronLockMock.acquire).toHaveBeenCalledTimes(1)
      expect(trendingMock.refreshTrendingScores).toHaveBeenCalledTimes(1)
    })

    it('clears the running flag even when a refresh throws', async () => {
      trendingMock.refreshTrendingScores.mockRejectedValueOnce(new Error('db down'))
      await scheduler.handleTrendingRefresh()
      await scheduler.handleTrendingRefresh()

      expect(trendingMock.refreshTrendingScores).toHaveBeenCalledTimes(2)
    })
  })

  /**
   * The boot refresh is the case a @Cron-only lock would miss entirely, and it is the case
   * most likely to double-fire: a rolling deploy boots both replicas within seconds.
   */
  describe('boot refresh', () => {
    it('refreshes on boot when it wins the lock', async () => {
      await scheduler.onModuleInit()

      expect(trendingMock.refreshTrendingScores).toHaveBeenCalledTimes(1)
      expect(cronLockMock.release).toHaveBeenCalledWith(TRENDING_LOCK_KEY)
    })

    // Deliberately the SAME key as the cron, not a key of its own: scores are global database
    // state, so "the other pod is already refreshing" satisfies the reason the boot refresh
    // exists just as well as doing it here would.
    it('uses the same lock as the cron so a co-booting replica cannot double-fire', async () => {
      await scheduler.onModuleInit()
      expect(cronLockMock.acquire).toHaveBeenCalledWith(TRENDING_LOCK_KEY, TRENDING_LOCK_TTL_MS)
    })

    it('does NOT refresh on boot when another replica holds the lock', async () => {
      cronLockMock.acquire.mockResolvedValue(false)
      await scheduler.onModuleInit()

      expect(trendingMock.refreshTrendingScores).not.toHaveBeenCalled()
      expect(cronLockMock.release).not.toHaveBeenCalled()
    })

    // Pre-existing behaviour: onModuleInit awaits the refresh and lets it propagate, so a
    // broken database fails bootstrap loudly instead of booting with stale scores.
    it('still propagates a boot refresh failure', async () => {
      trendingMock.refreshTrendingScores.mockRejectedValue(new Error('db down'))
      await expect(scheduler.onModuleInit()).rejects.toThrow('db down')
      expect(cronLockMock.release).toHaveBeenCalledWith(TRENDING_LOCK_KEY)
    })
  })

  // Pins the VALUE. Every assertion above compares the implementation against the same
  // constant it reads from, so the TTL could regress past the cadence and they would all pass.
  it('pins a TTL strictly under the five-minute cadence', () => {
    expect(TRENDING_LOCK_TTL_MS).toBe(4 * 60 * 1000)
    // Above the cadence, one crashed holder would skip ticks indefinitely.
    expect(TRENDING_LOCK_TTL_MS).toBeLessThan(5 * 60 * 1000)
  })
})
