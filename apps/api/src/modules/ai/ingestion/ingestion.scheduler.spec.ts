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
      renew: jest.fn().mockResolvedValue(undefined),
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

  // FIFO is not decorative: with a backlog above SWEEP_BATCH_SIZE, `desc` would re-select the
  // newest rows every sweep and the oldest PENDING files would starve forever.
  it('takes the oldest files first', async () => {
    await scheduler.sweep()
    expect(prismaMock.file.findMany.mock.calls[0][0].orderBy).toEqual({ createdAt: 'asc' })
  })

  // Dropping ingestStatus from the select silently zeroes the re-pick count, which is the one
  // signal that says STUCK_AFTER_MS is set too low for the documents being uploaded.
  it('selects the status so re-picks can be counted', async () => {
    await scheduler.sweep()
    expect(prismaMock.file.findMany.mock.calls[0][0].select).toEqual({
      id: true,
      ingestStatus: true,
    })
  })

  it('ingests each selected file', async () => {
    prismaMock.file.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }])
    await scheduler.sweep()
    expect(ingestionMock.ingestFile).toHaveBeenCalledTimes(2)
    expect(ingestionMock.ingestFile).toHaveBeenNthCalledWith(1, 'a')
    expect(ingestionMock.ingestFile).toHaveBeenNthCalledWith(2, 'b')
  })

  // The nth-call assertions above cannot see the difference between a serial loop and
  // Promise.all -- both start the calls in order. This can. Serial dispatch is load-bearing:
  // EmbeddingService caps concurrency per embedDocuments() call, not globally, so 20 files in
  // parallel means up to 40 concurrent batches against an Ollama requesting 100m CPU.
  it('ingests files one at a time, not in parallel', async () => {
    prismaMock.file.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }])
    let inFlight = 0
    let maxInFlight = 0
    ingestionMock.ingestFile.mockImplementation(async () => {
      maxInFlight = Math.max(maxInFlight, ++inFlight)
      await new Promise((r) => setTimeout(r, 1))
      inFlight--
    })

    await scheduler.sweep()

    expect(maxInFlight).toBe(1)
  })

  // These pin the VALUES. Every other assertion in this file compares the implementation
  // against the same exported constant it reads from, which is a tautology: STUCK_AFTER_MS
  // could regress from 60 minutes to 1 -- the exact racing-double-start defect its docblock
  // warns against -- and the whole suite would still pass.
  it('pins the tuning constants', () => {
    expect(STUCK_AFTER_MS).toBe(60 * 60 * 1000)
    expect(SWEEP_BATCH_SIZE).toBe(20)
    // Encodes the ordering constraint as an executable invariant rather than prose:
    // a TTL at or above the staleness threshold would let a crashed pod block every
    // sweep until the rows it abandoned became eligible for re-pick anyway.
    expect(SWEEP_LOCK_TTL_MS).toBeLessThan(STUCK_AFTER_MS)
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

  // Renewal is what makes SWEEP_LOCK_TTL_MS < STUCK_AFTER_MS satisfiable. Without it the lock
  // expires mid-batch and a second pod re-selects every row this sweep has not started yet --
  // those rows are still PENDING, so the staleness threshold does not protect them.
  describe('lock renewal', () => {
    it('renews the lock after every file, so the lease only spans one file', async () => {
      prismaMock.file.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }, { id: 'c' }])
      await scheduler.sweep()

      expect(cronLockMock.renew).toHaveBeenCalledTimes(3)
      expect(cronLockMock.renew).toHaveBeenCalledWith(SWEEP_LOCK_KEY, SWEEP_LOCK_TTL_MS)
    })

    it('renews after the ingest, not before it', async () => {
      prismaMock.file.findMany.mockResolvedValue([{ id: 'a' }])
      const order: string[] = []
      ingestionMock.ingestFile.mockImplementation(async () => void order.push('ingest'))
      cronLockMock.renew.mockImplementation(async () => void order.push('renew'))

      await scheduler.sweep()

      expect(order).toEqual(['ingest', 'renew'])
    })

    it('does not renew when there is nothing to ingest', async () => {
      await scheduler.sweep()
      expect(cronLockMock.renew).not.toHaveBeenCalled()
    })

    it('keeps sweeping the rest of the batch when a renewal fails', async () => {
      prismaMock.file.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }])
      cronLockMock.renew.mockRejectedValue(new Error('redis gone'))

      await scheduler.sweep()

      // A failed renewal only risks another pod joining in; aborting would strand the tail.
      expect(ingestionMock.ingestFile).toHaveBeenCalledTimes(2)
      expect(cronLockMock.release).toHaveBeenCalledWith(SWEEP_LOCK_KEY)
    })
  })

  // The release runs in `finally`, i.e. after the catch block, so a rejection there has
  // nothing left to catch it and would escape a @Cron handler as an unhandled rejection.
  it('does not reject when releasing the lock fails', async () => {
    cronLockMock.release.mockRejectedValue(new Error('redis gone'))
    await expect(scheduler.sweep()).resolves.toBeUndefined()
  })
})
