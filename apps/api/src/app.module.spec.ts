import { APP_GUARD } from '@nestjs/core'
import { AppModule } from './app.module'
import { SharedTermsGuard } from './auth/shared-terms.guard'
import { GuestReadOnlyGuard } from './common/guards/guest-read-only.guard'

jest.mock('./auth/auth.config', () => ({ auth: {} }))

describe('AppModule global guards', () => {
  it('runs the auth guard before the guest check, which reads the user it sets', () => {
    const providers = Reflect.getMetadata('providers', AppModule) as {
      provide?: unknown
      useClass?: unknown
    }[]
    const guards = providers.filter((p) => p.provide === APP_GUARD).map((p) => p.useClass)
    expect(guards).toEqual([SharedTermsGuard, GuestReadOnlyGuard])
  })
})
