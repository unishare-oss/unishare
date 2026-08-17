import { SetMetadata } from '@nestjs/common'
import { THROTTLE_BUCKET } from '@/common/guards/user-throttler.guard'

/**
 * Counts this handler against a NAMED allowance shared with every other handler using the same
 * name, instead of the per-handler bucket nestjs-throttler uses by default.
 *
 * For limits that protect a shared resource rather than a route — the AI chat endpoints spend
 * from one provider token budget, so 20/min each would mean 40/min of spend.
 */
export const ThrottleBucket = (name: string) => SetMetadata(THROTTLE_BUCKET, name)
