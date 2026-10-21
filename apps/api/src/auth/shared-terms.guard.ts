import { ForbiddenException, Injectable, type ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthGuard } from '@thallesp/nestjs-better-auth'
import { auth } from './auth.config'

/** Authenticate and authorize with the existing guard before checking shared acceptance. */
@Injectable()
export class SharedTermsGuard extends AuthGuard {
  constructor(private readonly termsReflector: Reflector) {
    super(termsReflector, { auth })
  }

  async canActivate(context: ExecutionContext) {
    const allowed = await super.canActivate(context)
    if (!allowed || context.getType() !== 'http') return allowed
    const targets = [context.getHandler(), context.getClass()]
    if (
      this.termsReflector.getAllAndOverride('PUBLIC', targets) ||
      this.termsReflector.getAllAndOverride('OPTIONAL', targets)
    )
      return allowed
    const request = context.switchToHttp().getRequest<{
      path: string
      user?: { isAnonymous?: boolean; unicorpTermsVersion?: number; unicorpTermsAcceptedAt?: Date }
    }>()
    if (['/api/users/me', '/api/users/me/export', '/api/users/me/consent'].includes(request.path))
      return allowed
    const user = request.user
    if (
      user &&
      !user.isAnonymous &&
      (user.unicorpTermsVersion !== 1 || !user.unicorpTermsAcceptedAt)
    )
      throw new ForbiddenException({
        code: 'consent_required',
        message: 'Complete shared Unicorp terms through UniAuth',
      })
    return allowed
  }
}
