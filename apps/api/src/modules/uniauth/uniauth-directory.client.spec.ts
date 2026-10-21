import { ServiceUnavailableException } from '@nestjs/common'
import { UniauthDirectoryClient } from './uniauth-directory.client'

jest.mock('@/auth/uniauth-config', () => ({
  uniauthConfig: { issuer: 'http://auth.test/api/auth', clientId: 'unishare-client' },
  uniauthDirectoryConfig: () => ({
    clientId: 'm',
    clientSecret: 's',
    audiences: ['m'],
    origin: 'http://auth.test',
  }),
}))

describe('UniauthDirectoryClient', () => {
  const realFetch = global.fetch
  let script: Response[]
  beforeEach(() => {
    script = [Response.json({ access_token: 't', expires_in: 300 })]
    global.fetch = jest.fn(
      async () => script.shift() ?? Response.json({}, { status: 500 }),
    ) as typeof fetch
  })
  afterAll(() => {
    global.fetch = realFetch
  })

  it('reads a tombstone (a deleted account has no profile) as status deleted', async () => {
    script.push(Response.json({ data: { id: 'ua1', status: 'deleted', version: 4 } }))
    expect(await new UniauthDirectoryClient().read('ua1')).toEqual({
      id: 'ua1',
      status: 'deleted',
      version: 4,
    })
  })

  it('maps batch results, including a found tombstone and the memberships', async () => {
    script.push(
      Response.json({
        data: {
          results: [
            {
              id: 'a',
              result: 'found',
              data: {
                id: 'a',
                name: 'A',
                email: 'a@x.com',
                emailVerified: true,
                image: null,
                status: 'active',
                version: 2,
                'urn:uniauth:organizations': [{ id: 'o', verified: true }],
              },
            },
            { id: 'b', result: 'found', data: { id: 'b', status: 'deleted', version: 3 } },
            { id: 'c', result: 'not_found' },
          ],
        },
      }),
    )
    const results = await new UniauthDirectoryClient().batch(['a', 'b', 'c'])
    expect(results.get('a')!.identity).toMatchObject({
      version: 2,
      'urn:uniauth:organizations': [{ id: 'o', verified: true }],
    })
    expect(results.get('b')!.identity).toEqual({ id: 'b', status: 'deleted', version: 3 })
    expect(results.get('c')).toEqual({ result: 'not_found', identity: null })
  })

  it('answers 503 for anything it cannot parse, never "not found"', async () => {
    script.push(Response.json({ data: { id: 'ua1', status: 'weird', version: 1 } }))
    await expect(new UniauthDirectoryClient().read('ua1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    )
  })
})
