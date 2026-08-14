import { Logger } from '@nestjs/common'
import { runWithCronLock } from './run-with-cron-lock'

describe('runWithCronLock', () => {
  let lock: { acquire: jest.Mock; release: jest.Mock; renew: jest.Mock }
  let logger: Logger

  beforeEach(() => {
    lock = {
      acquire: jest.fn().mockResolvedValue(true),
      release: jest.fn().mockResolvedValue(undefined),
      renew: jest.fn().mockResolvedValue(undefined),
    }
    logger = new Logger('test')
    jest.spyOn(logger, 'debug').mockImplementation(() => undefined)
    jest.spyOn(logger, 'error').mockImplementation(() => undefined)
  })

  const run = (job: () => Promise<void>) => runWithCronLock(lock, 'a-job', 1234, logger, job)

  it('acquires the lock under the caller-supplied key and TTL', async () => {
    await run(async () => undefined)
    expect(lock.acquire).toHaveBeenCalledWith('a-job', 1234)
  })

  it('runs the job body and releases the lock when the lock is acquired', async () => {
    const job = jest.fn().mockResolvedValue(undefined)
    await run(job)

    expect(job).toHaveBeenCalledTimes(1)
    expect(lock.release).toHaveBeenCalledWith('a-job')
  })

  it('releases only after the job body has finished', async () => {
    const order: string[] = []
    lock.release.mockImplementation(async () => void order.push('release'))
    await run(async () => void order.push('job'))

    expect(order).toEqual(['job', 'release'])
  })

  // The whole point of the lock: the replica that loses the race must not do the work.
  it('does NOT run the job body when the lock is held elsewhere', async () => {
    lock.acquire.mockResolvedValue(false)
    const job = jest.fn().mockResolvedValue(undefined)

    await run(job)

    expect(job).not.toHaveBeenCalled()
  })

  // The lock belongs to whichever pod won. Releasing it here would hand the loser's tick the
  // power to free the winner's lock mid-run. CronLockService.release is owner-gated as well,
  // but the call itself must not happen -- that gate is a second line of defence, not the one
  // being tested here.
  it('does NOT release a lock it never acquired', async () => {
    lock.acquire.mockResolvedValue(false)
    await run(async () => undefined)

    expect(lock.release).not.toHaveBeenCalled()
  })

  // A leaked lock is the worst failure mode available here: nothing errors, and the job is
  // silently disabled on every replica until the TTL expires.
  it('releases the lock even when the job body throws', async () => {
    await expect(run(async () => Promise.reject(new Error('boom')))).rejects.toThrow('boom')
    expect(lock.release).toHaveBeenCalledWith('a-job')
  })

  it('propagates the job body error rather than swallowing it', async () => {
    await expect(run(async () => Promise.reject(new Error('boom')))).rejects.toThrow('boom')
  })

  // release() runs in `finally`, i.e. outside any catch, so an unhandled rejection there would
  // escape a @Cron handler entirely.
  it('does not reject when releasing the lock fails', async () => {
    lock.release.mockRejectedValue(new Error('redis gone'))
    await expect(run(async () => undefined)).resolves.toBeUndefined()
  })

  // ...and it must not replace the body's error with the release error either.
  it('surfaces the job error, not the release error, when both fail', async () => {
    lock.release.mockRejectedValue(new Error('redis gone'))
    await expect(run(async () => Promise.reject(new Error('boom')))).rejects.toThrow('boom')
  })
})
