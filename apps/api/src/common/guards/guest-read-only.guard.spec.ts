import { Controller, ForbiddenException, type ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { GuestReadOnly } from '@/common/decorators/guest-read-only.decorator'
import { GuestReadOnlyGuard } from './guest-read-only.guard'

@GuestReadOnly()
@Controller('posts')
class MarkedController {
  handle() {}
}

@GuestReadOnly()
@Controller('files')
class ExemptMethodController {
  @GuestReadOnly(false)
  handle() {}
}

@Controller('users')
class UnmarkedController {
  handle() {}
}

describe('GuestReadOnlyGuard', () => {
  const guard = new GuestReadOnlyGuard(new Reflector())
  const context = (
    controller: { prototype: { handle: () => void } },
    method: string,
    user?: object,
  ) =>
    ({
      getType: () => 'http',
      getHandler: () => controller.prototype.handle,
      getClass: () => controller,
      switchToHttp: () => ({ getRequest: () => ({ method, user }) }),
    }) as unknown as ExecutionContext
  const guest = { isAnonymous: true }

  it('refuses a guest changing content on a marked controller with 403, whatever the path spelling', () => {
    for (const method of ['POST', 'PATCH', 'PUT', 'DELETE']) {
      expect(() => guard.canActivate(context(MarkedController, method, guest))).toThrow(
        ForbiddenException,
      )
    }
  })

  it('lets a guest read a marked controller', () => {
    for (const method of ['GET', 'HEAD', 'OPTIONS']) {
      expect(guard.canActivate(context(MarkedController, method, guest))).toBe(true)
    }
  })

  it('lets a guest call a method marked @GuestReadOnly(false) on a marked controller', () => {
    expect(guard.canActivate(context(ExemptMethodController, 'POST', guest))).toBe(true)
  })

  it('leaves unmarked controllers to their own rules', () => {
    expect(guard.canActivate(context(UnmarkedController, 'POST', guest))).toBe(true)
  })

  it('leaves members and signed-out requests to the other guards', () => {
    expect(guard.canActivate(context(MarkedController, 'POST', { isAnonymous: false }))).toBe(true)
    expect(guard.canActivate(context(MarkedController, 'POST'))).toBe(true)
  })
})
