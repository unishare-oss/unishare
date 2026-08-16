import { Test, TestingModule } from '@nestjs/testing'
import { TasksService, TASK_LOCK_TTL_MS, TaskLockName, ANONYMOUS_GRACE_MS } from './tasks.service'
import { PrismaService } from '@/prisma/prisma.service'
import { CronLockService } from '@/common/cron-lock.service'
import { StorageService } from '@/modules/storage/storage.service'

describe('TasksService', () => {
  let service: TasksService
  let prisma: {
    user: { deleteMany: jest.Mock; updateMany: jest.Mock }
    notification: { deleteMany: jest.Mock }
    session: { deleteMany: jest.Mock }
    comment: { deleteMany: jest.Mock }
    post: { findMany: jest.Mock; deleteMany: jest.Mock }
    [key: string]: any
  }
  let storage: { deleteFile: jest.Mock }
  let cronLock: { acquire: jest.Mock; release: jest.Mock; renew: jest.Mock }

  beforeEach(async () => {
    prisma = {
      user: { deleteMany: jest.fn(), updateMany: jest.fn() },
      notification: { deleteMany: jest.fn() },
      session: { deleteMany: jest.fn() },
      comment: { deleteMany: jest.fn() },
      post: {
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    }
    storage = { deleteFile: jest.fn() }
    // Defaults to "this replica won the race", so every pre-existing body assertion below
    // still exercises the body exactly as it did before the lock was introduced.
    cronLock = {
      acquire: jest.fn().mockResolvedValue(true),
      release: jest.fn().mockResolvedValue(undefined),
      renew: jest.fn().mockResolvedValue(undefined),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storage },
        { provide: CronLockService, useValue: cronLock },
      ],
    }).compile()

    service = module.get<TasksService>(TasksService)
  })

  describe('pruneAnonymousUsers', () => {
    it('deletes anonymous users only once every session of theirs has expired', async () => {
      prisma.user.deleteMany.mockResolvedValue({ count: 0 })

      const before = new Date()
      await service.pruneAnonymousUsers()

      // This replaces an assertion for `createdAt: { lt: sevenDaysAgo }`, which had gone stale
      // against the implementation and failed on every run. Session-based is the correct rule
      // and the age-based one was a real bug: an anonymous user who has been browsing for more
      // than seven days would have been deleted mid-session.
      expect(prisma.user.deleteMany).toHaveBeenCalledWith({
        where: {
          isAnonymous: true,
          sessions: { none: { expiresAt: { gt: expect.any(Date) } } },
          createdAt: { lt: expect.any(Date) },
        },
      })

      // The boundary is "now", not an offset — anything else either spares expired users or
      // reaps live ones.
      const gt = prisma.user.deleteMany.mock.calls[0][0].where.sessions.none.expiresAt.gt as Date
      expect(gt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(gt.getTime()).toBeLessThan(before.getTime() + 5000)
    })

    it('spares an anonymous user too new to have a session row yet', async () => {
      prisma.user.deleteMany.mockResolvedValue({ count: 0 })

      const before = new Date()
      await service.pruneAnonymousUsers()

      // `sessions: { none: ... }` is vacuously TRUE for a user with zero session rows, which is
      // the state of an account between its user row being written and its session row landing.
      // Without this floor the job deletes users who signed in seconds ago. Asserted as an
      // offset from now, so widening or dropping ANONYMOUS_GRACE_MS fails rather than being
      // absorbed by a loose `expect.any(Date)`.
      const lt = prisma.user.deleteMany.mock.calls[0][0].where.createdAt.lt as Date
      const expected = before.getTime() - ANONYMOUS_GRACE_MS
      expect(Math.abs(lt.getTime() - expected)).toBeLessThan(5000)
      expect(ANONYMOUS_GRACE_MS).toBeGreaterThanOrEqual(60 * 1000)
    })

    it('should log when users are pruned', async () => {
      prisma.user.deleteMany.mockResolvedValue({ count: 3 })
      const logSpy = jest.spyOn(service['logger'], 'log')

      await service.pruneAnonymousUsers()

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('3 anonymous users'))
    })

    it('should not log when no users are pruned', async () => {
      prisma.user.deleteMany.mockResolvedValue({ count: 0 })
      const logSpy = jest.spyOn(service['logger'], 'log')

      await service.pruneAnonymousUsers()

      expect(logSpy).not.toHaveBeenCalled()
    })
  })

  // Production runs api.replicas: 2 and ScheduleModule registers @Cron in every replica, so
  // each job below fires once per pod per tick. Every write is idempotent, so this is a
  // wasted-work fix rather than a corruption fix -- but the guarantee still has to hold.
  describe('cross-pod lock', () => {
    /**
     * One row per job: the handler, and the Prisma call that proves its body actually ran.
     * Asserting on the Prisma call rather than on a spy over the callback is deliberate --
     * it is the observable effect a duplicate replica would have on the database.
     */
    const jobs: { name: TaskLockName; run: () => Promise<void>; body: () => jest.Mock }[] = [
      {
        name: 'prune-old-notifications',
        run: () => service.pruneOldNotifications(),
        body: () => prisma.notification.deleteMany,
      },
      {
        name: 'prune-expired-sessions',
        run: () => service.pruneExpiredSessions(),
        body: () => prisma.session.deleteMany,
      },
      {
        name: 'lift-expired-bans',
        run: () => service.liftExpiredBans(),
        body: () => prisma.user.updateMany,
      },
      {
        name: 'prune-anonymous-users',
        run: () => service.pruneAnonymousUsers(),
        body: () => prisma.user.deleteMany,
      },
      {
        name: 'purge-deleted-content',
        run: () => service.purgeDeletedContent(),
        body: () => prisma.comment.deleteMany,
      },
    ]

    beforeEach(() => {
      for (const model of ['user', 'notification', 'session', 'comment', 'post'] as const) {
        for (const fn of ['deleteMany', 'updateMany'] as const) {
          prisma[model][fn]?.mockResolvedValue({ count: 0 })
        }
      }
    })

    it.each(jobs)('$name acquires its own lock with its own TTL', async ({ name, run }) => {
      await run()
      expect(cronLock.acquire).toHaveBeenCalledWith(name, TASK_LOCK_TTL_MS[name])
    })

    it.each(jobs)('$name runs its body when the lock is acquired', async ({ run, body }) => {
      await run()
      expect(body()).toHaveBeenCalled()
    })

    it.each(jobs)('$name releases the lock afterwards', async ({ name, run }) => {
      await run()
      expect(cronLock.release).toHaveBeenCalledWith(name)
    })

    it.each(jobs)(
      '$name does NOT touch the database when another replica holds the lock',
      async ({ run, body }) => {
        cronLock.acquire.mockResolvedValue(false)
        await run()
        expect(body()).not.toHaveBeenCalled()
      },
    )

    // Releasing here would let the losing replica free the winner's lock mid-run.
    it.each(jobs)('$name does NOT release a lock it never held', async ({ run }) => {
      cronLock.acquire.mockResolvedValue(false)
      await run()
      expect(cronLock.release).not.toHaveBeenCalled()
    })

    // A leaked lock silently disables the job on BOTH replicas until the TTL expires, and
    // nothing errors while that is happening -- the worst failure available here.
    it.each(jobs)(
      '$name releases the lock even when its body throws',
      async ({ name, run, body }) => {
        body().mockRejectedValue(new Error('db down'))
        await expect(run()).rejects.toThrow('db down')
        expect(cronLock.release).toHaveBeenCalledWith(name)
      },
    )

    // Pins the VALUES. Every assertion above reads the same constant the implementation reads,
    // which is a tautology: a TTL could regress to 2 hours -- long enough for one crash to
    // skip the hourly job outright -- and they would all still pass.
    it('pins each TTL below its job cadence', () => {
      const hour = 60 * 60 * 1000
      expect(TASK_LOCK_TTL_MS['lift-expired-bans']).toBeLessThan(hour)
      for (const ttl of Object.values(TASK_LOCK_TTL_MS)) {
        expect(ttl).toBe(5 * 60 * 1000)
      }
    })

    // The stagger at 00:00 / 00:05 / 00:15 / 00:20 only survives if the jobs cannot contend
    // for one another's locks. Distinct keys are what guarantees that.
    it('gives every job a distinct lock key', () => {
      const keys = Object.keys(TASK_LOCK_TTL_MS)
      expect(new Set(keys).size).toBe(keys.length)
      expect(keys).toHaveLength(5)
    })
  })
})
