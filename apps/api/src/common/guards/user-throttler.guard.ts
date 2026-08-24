import { ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ThrottlerGuard } from '@nestjs/throttler'

/** Handlers sharing a bucket name are counted together rather than each getting their own. */
export const THROTTLE_BUCKET = 'throttle:bucket'

/**
 * Throttler guard that keys rate limits by authenticated user ID
 * instead of the default IP address.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // mcpSession first: it is the identity the request was actually authenticated as on
    // /mcp routes. A cookie session can be present alongside a bearer token (e.g. a
    // browser-based MCP client sending credentials), and keying off that instead would
    // throttle the wrong account and let per-user MCP limits be bypassed.
    return (
      (req.mcpSession?.userId as string | undefined) ??
      (req.session?.user?.id as string | undefined) ??
      req.ip ??
      'anonymous'
    )
  }

  /**
   * By default the storage key includes the handler name, so two endpoints each declaring
   * `limit: 20` give a user 40 calls a minute between them rather than 20.
   *
   * That is wrong wherever the limit exists to protect a shared resource rather than a route.
   * The AI chat endpoints are the case in point: the streaming and one-shot handlers spend from
   * the same provider token budget, and one large upload has already exhausted a day of it.
   *
   * A handler decorated with `@ThrottleBucket('name')` is counted under that name instead of its
   * own, so siblings share one allowance. Undecorated handlers keep the default per-handler
   * behaviour.
   */
  protected generateKey(context: ExecutionContext, suffix: string, name: string): string {
    const bucket = new Reflector().get<string>(THROTTLE_BUCKET, context.getHandler())
    if (!bucket) return super.generateKey(context, suffix, name)
    return `${name}-${bucket}-${suffix}`
  }
}
