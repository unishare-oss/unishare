import { Test, TestingModule } from '@nestjs/testing'
import { PrismaService } from '@/prisma/prisma.service'
import { CronLockService } from '@/common/cron-lock.service'
import {
  IngestionScheduler,
  STUCK_AFTER_MS,
  SWEEP_BATCH_SIZE,
  SWEEP_LOCK_KEY,
  SWEEP_LOCK_TTL_MS,
} from './ingestion.scheduler'
import { IngestionService } from './ingestion.service'
import { EmbeddingService } from '../embedding/embedding.service'

/** Lets an in-flight sweep run to its next real await (the lock, then the query). */
const flush = () => new Promise((resolve) => setImmediate(resolve))

describe('IngestionScheduler', () => {
  let scheduler: IngestionScheduler
  let prismaMock: any
  let ingestionMock: any
  let embeddingMock: any
  let cronLockMock: any

  beforeEach(async () => {
    prismaMock = { file: { findMany: jest.fn().mockResolvedValue([]) } }
    ingestionMock = { ingestFile: jest.fn().mockResolvedValue(undefined) }
    embeddingMock = { enabled: true }
    cronLockMock = {
      acquire: jest.fn().mockResolvedValue(true),
      release: jest.fn().mockResolvedValue(undefined),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestionScheduler,
        { provide: PrismaService, useValue: prismaMock },
        { provide: IngestionService, useValue: ingestionMock },
        { provide: EmbeddingService, useValue: embeddingMock },
        { provide: CronLockService, useValue: cronLockMock },
      ],
    }).compile()

    scheduler = module.get(IngestionScheduler)
  })

  it('does nothing when embeddings are disabled', async () => {
    embeddingMock.enabled = false
    await scheduler.sweep()
    expect(prismaMock.file.findMany).not.toHaveBeenCalled()
    expect(cronLockMock.acquire).not.toHaveBeenCalled()
  })

  it('selects PENDING files and PROCESSING files that have gone stale', async () => {
    const before = Date.now()
    await scheduler.sweep()

    const where = prismaMock.file.findMany.mock.calls[0][0].where
    expect(where.OR[0]).toEqual({ ingestStatus: 'PENDING' })
    expect(where.OR[1].ingestStatus).toBe('PROCESSING')

    const cutoff = where.OR[1].ingestStartedAt.lt as Date
    const expected = before - STUCK_AFTER_MS
    expect(Math.abs(cutoff.getTime() - expected)).toBeLessThan(5_000)
  })

  it('caps each sweep to a bounded batch', async () => {
    await scheduler.sweep()
    expect(prismaMock.file.findMany.mock.calls[0][0].take).toBe(SWEEP_BATCH_SIZE)
  })

  it('ingests each selected file', async () => {
    prismaMock.file.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }])
    await scheduler.sweep()
    expect(ingestionMock.ingestFile).toHaveBeenNthCalledWith(1, 'a')
    expect(ingestionMock.ingestFile).toHaveBeenNthCalledWith(2, 'b')
  })

  it('does not start a second sweep while one is still running', async () => {
    let finishFindMany: () => void = () => {}
    prismaMock.file.findMany.mockImplementation(
      () => new Promise((resolve) => (finishFindMany = () => resolve([]))),
    )

    const first = scheduler.sweep()
    // Let the first sweep get past lock acquisition and park on the query, so the second
    // call genuinely overlaps an in-flight sweep instead of racing its startup.
    await flush()
    expect(prismaMock.file.findMany).toHaveBeenCalledTimes(1)

    await scheduler.sweep() // must return immediately

    expect(prismaMock.file.findMany).toHaveBeenCalledTimes(1)
    finishFindMany()
    await first
  })

  // Pins why `running` is set before the first await rather than after acquiring the lock:
  // a tick arriving while the previous sweep is still waiting on Redis would otherwise sail
  // past the guard and run a second sweep inside the same pod.
  it('does not start a second sweep that ticks during the first lock acquisition', async () => {
    let grantLock: (acquired: boolean) => void = () => {}
    cronLockMock.acquire.mockImplementation(
      () => new Promise((resolve) => (grantLock = resolve as (acquired: boolean) => void)),
    )

    const first = scheduler.sweep()
    const second = scheduler.sweep()

    grantLock(true)
    await Promise.all([first, second])

    expect(cronLockMock.acquire).toHaveBeenCalledTimes(1)
    expect(prismaMock.file.findMany).toHaveBeenCalledTimes(1)
  })

  it('clears the running flag even when the sweep throws', async () => {
    prismaMock.file.findMany.mockRejectedValueOnce(new Error('db down'))
    await scheduler.sweep()

    prismaMock.file.findMany.mockResolvedValue([])
    await scheduler.sweep()
    expect(prismaMock.file.findMany).toHaveBeenCalledTimes(2)
  })

  describe('cross-pod lock', () => {
    it('acquires the sweep lock with a TTL longer than one sweep', async () => {
      await scheduler.sweep()
      expect(cronLockMock.acquire).toHaveBeenCalledWith(SWEEP_LOCK_KEY, SWEEP_LOCK_TTL_MS)
      expect(SWEEP_LOCK_TTL_MS).toBeGreaterThan(5 * 60 * 1000)
    })

    it('returns immediately without querying when the lock is held elsewhere', async () => {
      cronLockMock.acquire.mockResolvedValue(false)
      await scheduler.sweep()

      expect(prismaMock.file.findMany).not.toHaveBeenCalled()
      expect(ingestionMock.ingestFile).not.toHaveBeenCalled()
      // The lock belongs to whichever pod won; releasing it here would hand a second pod a
      // sweep that runs alongside the winner's.
      expect(cronLockMock.release).not.toHaveBeenCalled()
    })

    it('releases the lock even when the sweep body throws', async () => {
      prismaMock.file.findMany.mockRejectedValueOnce(new Error('db down'))
      await scheduler.sweep()
      expect(cronLockMock.release).toHaveBeenCalledWith(SWEEP_LOCK_KEY)
    })

    it('releases the lock when zero files are found', async () => {
      prismaMock.file.findMany.mockResolvedValue([])
      await scheduler.sweep()
      expect(cronLockMock.release).toHaveBeenCalledWith(SWEEP_LOCK_KEY)
    })

    it('releases the lock after a successful sweep', async () => {
      prismaMock.file.findMany.mockResolvedValue([{ id: 'a' }])
      await scheduler.sweep()
      expect(cronLockMock.release).toHaveBeenCalledWith(SWEEP_LOCK_KEY)
    })
  })
})
