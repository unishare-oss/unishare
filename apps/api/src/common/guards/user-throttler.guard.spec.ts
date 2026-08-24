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

  // `getTracker` is protected too.
  publicTracker(req: Record<string, any>): Promise<string> {
    return this.getTracker(req)
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

describe('UserThrottlerGuard getTracker', () => {
  let guard: TestGuard

  beforeEach(() => {
    guard = new TestGuard(
      { throttlers: [] } as never,
      {} as never,
      { get: () => undefined } as never,
    )
  })

  it('keys by cookie-session user id when present', async () => {
    await expect(
      guard.publicTracker({ session: { user: { id: 'user-1' } }, ip: '1.2.3.4' }),
    ).resolves.toBe('user-1')
  })

  it('falls back to the mcp session user id — McpController has no req.session', async () => {
    await expect(
      guard.publicTracker({ mcpSession: { userId: 'user-2' }, ip: '1.2.3.4' }),
    ).resolves.toBe('user-2')
  })

  it('prefers the mcp session over a cookie session when both are somehow present', async () => {
    // A stray session cookie must not let /mcp throttling key off — and be bypassed via — a
    // different, unrelated account.
    await expect(
      guard.publicTracker({
        session: { user: { id: 'user-1' } },
        mcpSession: { userId: 'user-2' },
      }),
    ).resolves.toBe('user-2')
  })

  it('falls back to the request ip when neither session is present', async () => {
    await expect(guard.publicTracker({ ip: '1.2.3.4' })).resolves.toBe('1.2.3.4')
  })

  it('falls back to "anonymous" when nothing identifies the caller', async () => {
    await expect(guard.publicTracker({})).resolves.toBe('anonymous')
  })
})
