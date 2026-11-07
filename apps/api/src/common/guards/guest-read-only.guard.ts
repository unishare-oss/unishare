import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'
import { GUEST_READ_ONLY } from '@/common/decorators/guest-read-only.decorator'

const READ_METHODS = ['GET', 'HEAD', 'OPTIONS']

/**
 * Guests (Better Auth anonymous users) browse read-only: on a `@GuestReadOnly()` controller any
 * other method is a 403. Keyed on the matched route's metadata, not the URL, so path spelling
 * (routing is case-insensitive) can't get around it. Runs after the auth guard, which has
 * already put the session user on the request.
 */
@Injectable()
export class GuestReadOnlyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    if (context.getType() !== 'http') return true
    const marked = this.reflector.getAllAndOverride<boolean>(GUEST_READ_ONLY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!marked) return true
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: { isAnonymous?: boolean | null } }>()
    if (!request.user?.isAnonymous || READ_METHODS.includes(request.method)) return true
    throw new ForbiddenException("Guests can't change content")
  }
}
