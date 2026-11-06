import { parseUserInput } from 'better-auth/db'
import { auth } from './auth.config'

describe('auth config', () => {
  // Better Auth starts uniauth discovery on creation; let it settle (it fails offline) first.
  beforeAll(() => auth.$context.catch(() => undefined))

  it("refuses universityId on update-user: only uniauth sets a member's university", () => {
    // The same parsing Better Auth's /update-user runs on the request body
    expect(() => parseUserInput(auth.options, { universityId: 'u1' }, 'update')).toThrow(
      expect.objectContaining({ body: expect.objectContaining({ code: 'FIELD_NOT_ALLOWED' }) }),
    )
  })

  it.each([
    [
      'sign-in',
      () => auth.api.signInSocial({ body: { provider: 'uniauth', idToken: { token: 'old' } } }),
    ],
    [
      'link',
      () =>
        auth.api.linkSocialAccount({
          body: { provider: 'uniauth', idToken: { token: 'old' } },
          headers: new Headers(),
        }),
    ],
  ])(
    'refuses a %s with a client-posted ID token: only the redirect brings a fresh one',
    async (_, call) => {
      await expect(call()).rejects.toMatchObject({
        body: expect.objectContaining({ code: 'ID_TOKEN_SIGN_IN_DISABLED' }),
      })
    },
  )

  it('still starts the normal redirect sign-in', async () => {
    await expect(
      auth.api.signInSocial({ body: { provider: 'uniauth', idToken: undefined } }),
    ).rejects.not.toMatchObject({
      body: expect.objectContaining({ code: 'ID_TOKEN_SIGN_IN_DISABLED' }),
    })
  })
})
