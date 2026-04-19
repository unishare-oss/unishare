import { Injectable } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'

/**
 * Throttler guard that keys rate limits by authenticated user ID
 * instead of the default IP address.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return (req.session?.user?.id as string | undefined) ?? req.ip ?? 'anonymous'
  }
}
