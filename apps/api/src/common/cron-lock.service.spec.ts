import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
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

  it('acquires the lock when SET returns OK', async () => {
    await expect(service.acquire('cron-lock:x', 1000)).resolves.toBe(true)
  })

  it('does not acquire the lock when SET returns null', async () => {
    redisMock.set.mockResolvedValue(null)
    await expect(service.acquire('cron-lock:x', 1000)).resolves.toBe(false)
  })

  // Asserts the exact argument list, not merely that set() was called: a SET without NX
  // always succeeds and therefore locks nothing, and that bug is invisible to a
  // "was it called" assertion.
  it('sets the key with PX, the ttl, and NX', async () => {
    await service.acquire('cron-lock:x', 30_000)

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

  it('stores an owner value unique to this instance', async () => {
    await service.acquire('cron-lock:x', 1000)
    await service.release('cron-lock:x')

    const owner = redisMock.set.mock.calls[0][1] as string
    expect(redisMock.eval.mock.calls[0][3]).toBe(owner)
    expect(owner).toMatch(new RegExp(`^${process.pid}-`))
  })

  it('proceeds unlocked when redis rejects', async () => {
    redisMock.set.mockRejectedValue(new Error('ECONNREFUSED'))
    await expect(service.acquire('cron-lock:x', 1000)).resolves.toBe(true)
  })

  it('releases with a compare-and-delete Lua script keyed on this instance owner', async () => {
    await service.acquire('cron-lock:x', 1000)
    await service.release('cron-lock:x')

    const owner = redisMock.set.mock.calls[0][1] as string
    expect(redisMock.eval).toHaveBeenCalledWith(RELEASE_SCRIPT, 1, 'cron-lock:x', owner)
  })

  it('swallows a rejection from release rather than throwing', async () => {
    redisMock.eval.mockRejectedValue(new Error('ECONNREFUSED'))
    await expect(service.release('cron-lock:x')).resolves.toBeUndefined()
  })

  it('disconnects on shutdown', () => {
    service.onModuleDestroy()
    expect(redisMock.disconnect).toHaveBeenCalled()
  })
})
