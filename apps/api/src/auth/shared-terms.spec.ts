import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { exportJWK, generateKeyPair, SignJWT } from 'jose'

describe('verifiedSharedTerms', () => {
  let server: Server
  let verify: typeof import('./shared-terms').verifiedSharedTerms
  let privateKey: Awaited<ReturnType<typeof generateKeyPair>>['privateKey']
  let issuer: string
  const originalIssuer = process.env.UNIAUTH_ISSUER
  const originalClient = process.env.UNIAUTH_CLIENT_ID
  beforeAll(async () => {
    const pair = await generateKeyPair('RS256')
    privateKey = pair.privateKey
    const jwk = {
      ...(await exportJWK(pair.publicKey)),
      kid: 'shared-test',
      alg: 'RS256',
      use: 'sig',
    }
    server = createServer((_request, response) => {
      response.setHeader('content-type', 'application/json')
      response.end(JSON.stringify({ keys: [jwk] }))
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    issuer = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/auth`
    process.env.UNIAUTH_ISSUER = issuer
    process.env.UNIAUTH_CLIENT_ID = 'unishare-shared-test'
    verify = (await import('./shared-terms')).verifiedSharedTerms
  })
  afterAll(async () => {
    if (originalIssuer === undefined) delete process.env.UNIAUTH_ISSUER
    else process.env.UNIAUTH_ISSUER = originalIssuer
    if (originalClient === undefined) delete process.env.UNIAUTH_CLIENT_ID
    else process.env.UNIAUTH_CLIENT_ID = originalClient
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    )
  })
  const token = (extra: Record<string, unknown> = {}, audience = 'unishare-shared-test') =>
    new SignJWT({
      'urn:unicorp:terms': { version: 1, acceptedAt: '2026-10-21T00:00:00Z' },
      ...extra,
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'shared-test' })
      .setIssuer(issuer)
      .setAudience(audience)
      .setSubject('central-person')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey)

  it('copies the original shared timestamp only for the bound, signed identity', async () => {
    await expect(verify(await token(), 'central-person')).resolves.toEqual({
      unicorpTermsVersion: 1,
      unicorpTermsAcceptedAt: new Date('2026-10-21T00:00:00Z'),
    })
  })
  it('rejects another audience, another subject and event tokens', async () => {
    await expect(verify(await token({}, 'another-app'), 'central-person')).rejects.toThrow()
    await expect(verify(await token(), 'someone-else')).rejects.toThrow()
    await expect(
      verify(await token({ events: { logout: {} } }), 'central-person'),
    ).rejects.toThrow()
  })
  it('does not convert a missing, old or malformed record into acceptance', async () => {
    for (const value of [
      null,
      { version: 0, acceptedAt: '2026-10-21' },
      { version: 1, acceptedAt: 'invalid' },
    ])
      await expect(
        verify(await token({ 'urn:unicorp:terms': value }), 'central-person'),
      ).resolves.toEqual({ unicorpTermsVersion: null, unicorpTermsAcceptedAt: null })
  })
})
