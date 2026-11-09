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
    // A uniauth that answers discovery, so the provider is set up as in production. The config
    // is loaded fresh because discovery runs once, when it is created.
    const issuer = 'http://uniauth.test/api/auth'
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      Response.json({
        issuer,
        authorization_endpoint: `${issuer}/oauth2/authorize`,
        token_endpoint: `${issuer}/oauth2/token`,
        jwks_uri: `${issuer}/jwks`,
        id_token_signing_alg_values_supported: ['RS256'],
      }),
    )
    try {
      let redirectAuth!: typeof auth
      await jest.isolateModulesAsync(async () => {
        redirectAuth = (await import('./auth.config')).auth
      })
      // The sign-in state is kept in the database; there is none here.
      const ctx = await redirectAuth.$context
      jest
        .spyOn(ctx.internalAdapter, 'createVerificationValue')
        .mockImplementation(async (data) => ({
          id: 'v1',
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        }))

      const result = await redirectAuth.api.signInSocial({
        body: { provider: 'uniauth', callbackURL: '/' },
      })

      expect(result).toMatchObject({ redirect: true })
      const url = new URL((result as { url: string }).url)
      expect(`${url.origin}${url.pathname}`).toBe(`${issuer}/oauth2/authorize`)
      expect(url.searchParams.get('client_id')).toBe('unishare-test')
      expect(url.searchParams.get('state')).toBeTruthy()
    } finally {
      fetchSpy.mockRestore()
    }
  })
})
