import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { Logger } from '@nestjs/common'
import { CronLockService } from './cron-lock.service'

const redisMock = {
  set: jest.fn(),
  eval: jest.fn(),
  on: jest.fn(),
  disconnect: jest.fn(),
}

jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn(() => redisMock),
}))

const RELEASE_SCRIPT =
  'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end'
const RENEW_SCRIPT =
  'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("pexpire", KEYS[1], ARGV[2]) else return 0 end'

describe('CronLockService', () => {
  let service: CronLockService

  beforeEach(async () => {
    jest.clearAllMocks()
    redisMock.set.mockResolvedValue('OK')
    redisMock.eval.mockResolvedValue(1)

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CronLockService,
        { provide: ConfigService, useValue: { get: jest.fn(() => 'redis://localhost:6379') } },
      ],
    }).compile()

    service = module.get(CronLockService)
    service.onModuleInit()
  })

  /** The owner value this instance wrote on its first successful acquire. */
  const ownerFromFirstAcquire = () => redisMock.set.mock.calls[0][1] as string

  it('acquires the lock when SET returns OK', async () => {
    await expect(service.acquire('x', 1000)).resolves.toBe(true)
  })

  it('does not acquire the lock when SET returns null', async () => {
    redisMock.set.mockResolvedValue(null)
    await expect(service.acquire('x', 1000)).resolves.toBe(false)
  })

  // Asserts the exact argument list, not merely that set() was called: a SET without NX
  // always succeeds and therefore locks nothing, and that bug is invisible to a
  // "was it called" assertion.
  it('sets the key with PX, the ttl, and NX', async () => {
    await service.acquire('x', 30_000)

    expect(redisMock.set).toHaveBeenCalledTimes(1)
    const args = redisMock.set.mock.calls[0]
    expect(args).toHaveLength(5)
    expect(args[0]).toBe('cron-lock:x')
    expect(typeof args[1]).toBe('string')
    expect(args[1]).not.toHaveLength(0)
    expect(args[2]).toBe('PX')
    expect(args[3]).toBe(30_000)
    expect(args[4]).toBe('NX')
  })

  // The prefix lives in the service so five Task 17 callers cannot disagree about it.
  it('namespaces every key it touches', async () => {
    await service.acquire('ingestion-sweep', 1000)
    await service.renew('ingestion-sweep', 1000)
    await service.release('ingestion-sweep')

    expect(redisMock.set.mock.calls[0][0]).toBe('cron-lock:ingestion-sweep')
    expect(redisMock.eval.mock.calls[0][2]).toBe('cron-lock:ingestion-sweep')
    expect(redisMock.eval.mock.calls[1][2]).toBe('cron-lock:ingestion-sweep')
  })

  it('stores an owner value unique to this instance', async () => {
    await service.acquire('x', 1000)
    await service.release('x')

    const owner = ownerFromFirstAcquire()
    expect(redisMock.eval.mock.calls[0][3]).toBe(owner)
    expect(owner).toMatch(new RegExp(`^${process.pid}-`))
  })

  it('proceeds unlocked when redis rejects', async () => {
    redisMock.set.mockRejectedValue(new Error('ECONNREFUSED'))
    await expect(service.acquire('x', 1000)).resolves.toBe(true)
  })

  // Error, not warn: this catch also swallows programming errors into a permanent, silent
  // "nothing is ever locked" state, which is not a warning-level fact.
  it('logs the fail-open at error level', async () => {
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {})
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {})
    redisMock.set.mockRejectedValue(new Error('ECONNREFUSED'))

    await service.acquire('x', 1000)

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('proceeding unlocked'))
    expect(warnSpy).not.toHaveBeenCalled()
    errorSpy.mockRestore()
    warnSpy.mockRestore()
  })

  it('registers an error listener so a redis blip cannot crash the process', () => {
    expect(redisMock.on).toHaveBeenCalledWith('error', expect.any(Function))
  })

  it('disconnects on shutdown', () => {
    service.onModuleDestroy()
    expect(redisMock.disconnect).toHaveBeenCalled()
  })

  describe('release', () => {
    it('releases with a compare-and-delete Lua script keyed on this instance owner', async () => {
      await service.acquire('x', 1000)
      await service.release('x')

      expect(redisMock.eval).toHaveBeenCalledWith(
        RELEASE_SCRIPT,
        1,
        'cron-lock:x',
        ownerFromFirstAcquire(),
      )
    })

    it('swallows a rejection rather than throwing', async () => {
      await service.acquire('x', 1000)
      redisMock.eval.mockRejectedValue(new Error('ECONNREFUSED'))
      await expect(service.release('x')).resolves.toBeUndefined()
    })

    // The owner string is a per-process singleton, so Redis cannot distinguish a loser from
    // the winner inside one pod. Local ownership tracking is what makes release safe from an
    // unconditional finally -- which is how Task 17's five callers will use it.
    it('is a no-op for a key this instance never acquired', async () => {
      await service.release('never-held')
      expect(redisMock.eval).not.toHaveBeenCalled()
    })

    it('is a no-op for a key whose acquire was refused', async () => {
      redisMock.set.mockResolvedValue(null)
      await service.acquire('x', 1000)
      await service.release('x')
      expect(redisMock.eval).not.toHaveBeenCalled()
    })

    it('is a no-op when redis was unreachable at acquire time', async () => {
      redisMock.set.mockRejectedValue(new Error('ECONNREFUSED'))
      expect(await service.acquire('x', 1000)).toBe(true)

      await service.release('x')
      // Nothing was ever written, so there is nothing to compare-and-delete.
      expect(redisMock.eval).not.toHaveBeenCalled()
    })

    it('does not release twice for a single acquire', async () => {
      await service.acquire('x', 1000)
      await service.release('x')
      await service.release('x')
      expect(redisMock.eval).toHaveBeenCalledTimes(1)
    })
  })

  describe('renew', () => {
    it('extends a held lock with a compare-and-pexpire Lua script', async () => {
      await service.acquire('x', 1000)
      await service.renew('x', 30_000)

      expect(redisMock.eval).toHaveBeenCalledWith(
        RENEW_SCRIPT,
        1,
        'cron-lock:x',
        ownerFromFirstAcquire(),
        '30000',
      )
    })

    it('is a no-op for a key this instance does not hold', async () => {
      await service.renew('never-held', 30_000)
      expect(redisMock.eval).not.toHaveBeenCalled()
    })

    it('keeps holding the key so it can be renewed repeatedly', async () => {
      await service.acquire('x', 1000)
      await service.renew('x', 30_000)
      await service.renew('x', 30_000)
      expect(redisMock.eval).toHaveBeenCalledTimes(2)
    })

    it('is a no-op after release', async () => {
      await service.acquire('x', 1000)
      await service.release('x')
      redisMock.eval.mockClear()

      await service.renew('x', 30_000)
      expect(redisMock.eval).not.toHaveBeenCalled()
    })

    it('swallows a rejection rather than throwing', async () => {
      await service.acquire('x', 1000)
      redisMock.eval.mockRejectedValue(new Error('ECONNREFUSED'))
      await expect(service.renew('x', 30_000)).resolves.toBeUndefined()
    })
  })
})
