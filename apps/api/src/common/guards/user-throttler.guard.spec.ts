import { ExecutionContext } from '@nestjs/common'
import { UserThrottlerGuard, THROTTLE_BUCKET } from './user-throttler.guard'
import { ThrottleBucket } from '@/common/decorators/throttle-bucket.decorator'

/**
 * Guards the shared-bucket behaviour.
 *
 * nestjs-throttler keys storage by handler, so two endpoints each declaring `limit: 20` grant a
 * user 40 calls a minute between them. That is wrong when the limit protects a shared resource
 * rather than a route — the AI chat endpoints spend from one provider token budget, and one large
 * upload has already exhausted a day of it.
 */
class TestGuard extends UserThrottlerGuard {
  // `generateKey` is protected; this exposes it without loosening the real class.
  publicKey(context: ExecutionContext, suffix: string, name: string): string {
    return this.generateKey(context, suffix, name)
  }
}

function contextFor(handler: () => void): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => class Anything {},
  } as unknown as ExecutionContext
}

describe('UserThrottlerGuard shared buckets', () => {
  let guard: TestGuard

  beforeEach(() => {
    guard = new TestGuard(
      { throttlers: [] } as never,
      {} as never,
      { get: () => undefined } as never,
    )
  })

  it('gives two handlers in the same bucket the SAME key', () => {
    // The whole point: one allowance between them, not one each.
    class Controller {
      @ThrottleBucket('ai-chat')
      oneShot() {}

      @ThrottleBucket('ai-chat')
      streaming() {}
    }
    const c = new Controller()

    const a = guard.publicKey(contextFor(c.oneShot), 'user-1', 'default')
    const b = guard.publicKey(contextFor(c.streaming), 'user-1', 'default')

    expect(a).toBe(b)
  })

  it('keeps different buckets apart', () => {
    class Controller {
      @ThrottleBucket('ai-chat')
      chat() {}

      @ThrottleBucket('uploads')
      upload() {}
    }
    const c = new Controller()

    expect(guard.publicKey(contextFor(c.chat), 'user-1', 'default')).not.toBe(
      guard.publicKey(contextFor(c.upload), 'user-1', 'default'),
    )
  })

  it('keeps different users apart within one bucket', () => {
    // A shared bucket must not become a GLOBAL bucket — one user must not be able to exhaust
    // everyone else's allowance.
    class Controller {
      @ThrottleBucket('ai-chat')
      chat() {}
    }
    const c = new Controller()

    expect(guard.publicKey(contextFor(c.chat), 'user-1', 'default')).not.toBe(
      guard.publicKey(contextFor(c.chat), 'user-2', 'default'),
    )
  })

  it('leaves undecorated handlers on the default per-handler key', () => {
    // Opt-in only: sharing a bucket everywhere would silently tighten unrelated limits.
    class Controller {
      first() {}
      second() {}
    }
    const c = new Controller()

    expect(guard.publicKey(contextFor(c.first), 'user-1', 'default')).not.toBe(
      guard.publicKey(contextFor(c.second), 'user-1', 'default'),
    )
  })

  it('exposes the metadata key the decorator writes', () => {
    class Controller {
      @ThrottleBucket('ai-chat')
      chat() {}
    }

    expect(Reflect.getMetadata(THROTTLE_BUCKET, new Controller().chat)).toBe('ai-chat')
  })
})
