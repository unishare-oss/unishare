import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { Request } from 'express'
import type { UserSession } from '@/auth/auth.config'
import { universityScope } from '@/common/university-scope'

/**
 * The requester's `UniversityScope`. Reads `request.session` the way Better Auth's `@Session()`
 * does; its guard sets it before any handler runs, to `null` on a signed-out `@OptionalAuth` route.
 */
export const UniversityScopeParam = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request & { session?: UserSession | null }>()
    return universityScope(request.session?.user)
  },
)
