import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import {
  PresentonAccountsService,
  extractSessionCookie,
  presentonUsername,
} from './presenton-accounts.service'

/**
 * The brokering logic, which has no second chance to be right: passwords are DERIVED rather
 * than stored, so a change to the derivation silently orphans every existing account — every
 * student's decks become unreachable while their downloads keep working, which is the hardest
 * kind of failure to attribute.
 */
describe('PresentonAccountsService', () => {
  const env: Record<string, string> = {
    PRESENTON_BASE_URL: 'http://presenton',
    PRESENTON_ACCOUNT_SECRET: 'test-account-secret',
    PRESENTON_ADMIN_USERNAME: 'admin',
    PRESENTON_ADMIN_PASSWORD: 'admin-password',
    REDIS_URL: 'redis://localhost:6379',
  }

  let service: PresentonAccountsService
  const store = new Map<string, string>()

  beforeEach(async () => {
    store.clear()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PresentonAccountsService,
        {
          provide: ConfigService,
          useValue: { get: (key: string, fallback?: string) => env[key] ?? fallback },
        },
      ],
    }).compile()

    service = module.get(PresentonAccountsService)
    // Stand in for ioredis rather than connecting: onModuleInit is never called here.
    Object.defineProperty(service, 'redis', {
      value: {
        get: (k: string) => Promise.resolve(store.get(k) ?? null),
        set: (k: string, v: string) => {
          store.set(k, v)
          return Promise.resolve('OK')
        },
        del: (k: string) => {
          store.delete(k)
          return Promise.resolve(1)
        },
      },
      writable: true,
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  /** A login response carrying the session cookie the generator sets. */
  const loggedIn = () => ({
    ok: true,
    status: 200,
    headers: {
      getSetCookie: () => ['presenton_session=tok123; Path=/; HttpOnly; SameSite=Lax'],
    },
  })
  const rejected = () => ({ ok: false, status: 401, headers: { getSetCookie: () => [] } })
  const created = () => ({ ok: true, status: 201, headers: { getSetCookie: () => [] } })

  describe('username', () => {
    it('prefixes the id so it satisfies the generator own validation rules', () => {
      // Minimum three characters, no whitespace.
      expect(presentonUsername('abc123')).toBe('u_abc123')
      expect(presentonUsername('abc123')).not.toMatch(/\s/)
      expect(presentonUsername('a').length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('sessionFor', () => {
    it('logs in with a derived password and caches the cookie', async () => {
      const fetchMock = jest.fn().mockResolvedValue(loggedIn())
      globalThis.fetch = fetchMock as never

      const cookie = await service.sessionFor('user-1')
      expect(cookie).toBe('presenton_session=tok123')

      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe('http://presenton/api/v1/auth/login')
      const body = JSON.parse(init.body as string) as { username: string; password: string }
      expect(body.username).toBe('u_user-1')
      // Long enough to be a credential, and never the raw user id.
      expect(body.password.length).toBe(32)
      expect(body.password).not.toContain('user-1')

      // Second call is served from cache: brokering sits on the request path of every asset
      // the editor loads, so a login per request would be a round trip per chunk.
      await service.sessionFor('user-1')
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('derives the same password every time, and a different one per user', async () => {
      const fetchMock = jest.fn().mockResolvedValue(loggedIn())
      globalThis.fetch = fetchMock as never

      await service.sessionFor('user-1')
      store.clear()
      await service.sessionFor('user-1')
      await service.sessionFor('user-2')

      const passwords = fetchMock.mock.calls.map(
        ([, init]) => (JSON.parse(init.body as string) as { password: string }).password,
      )
      expect(passwords[0]).toBe(passwords[1])
      expect(passwords[2]).not.toBe(passwords[0])
    })

    it('provisions the account when the first login is rejected', async () => {
      // First use for a student: no account exists yet, so login fails and one is created
      // through an admin session before logging in again.
      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce(rejected()) // student login
        .mockResolvedValueOnce(loggedIn()) // admin login
        .mockResolvedValueOnce(created()) // admin/users
        .mockResolvedValueOnce(loggedIn()) // student login, retried
      globalThis.fetch = fetchMock as never

      await expect(service.sessionFor('user-1')).resolves.toBe('presenton_session=tok123')

      const urls = fetchMock.mock.calls.map(([url]) => url as string)
      expect(urls).toEqual([
        'http://presenton/api/v1/auth/login',
        'http://presenton/api/v1/auth/login',
        'http://presenton/api/v1/admin/users',
        'http://presenton/api/v1/auth/login',
      ])

      // Creation must carry the admin's session: admin/users rejects the API key with
      // "Admin browser session required".
      const [, createInit] = fetchMock.mock.calls[2]
      expect((createInit as { headers: Record<string, string> }).headers.Cookie).toBe(
        'presenton_session=tok123',
      )
    })

    it('fails loudly when the account still cannot be used after provisioning', async () => {
      globalThis.fetch = jest
        .fn()
        .mockResolvedValueOnce(rejected())
        .mockResolvedValueOnce(loggedIn())
        .mockResolvedValueOnce(created())
        .mockResolvedValueOnce(rejected()) as never

      await expect(service.sessionFor('user-1')).rejects.toThrow(/editor session/i)
    })

    it('refuses to derive a password with no secret configured', async () => {
      delete env.PRESENTON_ACCOUNT_SECRET
      globalThis.fetch = jest.fn().mockResolvedValue(loggedIn()) as never
      await expect(service.sessionFor('user-1')).rejects.toThrow(/PRESENTON_ACCOUNT_SECRET/)
      env.PRESENTON_ACCOUNT_SECRET = 'test-account-secret'
    })
  })

  describe('invalidate', () => {
    it('forces the next call to log in again', async () => {
      const fetchMock = jest.fn().mockResolvedValue(loggedIn())
      globalThis.fetch = fetchMock as never

      await service.sessionFor('user-1')
      await service.invalidate('user-1')
      await service.sessionFor('user-1')
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })
  })

  describe('extractSessionCookie', () => {
    it('reads the session pair and drops the attributes', () => {
      const res = {
        headers: { getSetCookie: () => ['presenton_session=abc; Path=/; HttpOnly'] },
      } as unknown as Response
      expect(extractSessionCookie(res)).toBe('presenton_session=abc')
    })

    it('picks the session cookie out of several', () => {
      // getSetCookie rather than get('set-cookie') precisely because the latter joins headers
      // with commas, and cookie values may legitimately contain one.
      const res = {
        headers: {
          getSetCookie: () => [
            'other=1; Path=/',
            'presenton_session=abc; Expires=Wed, 21 Oct 2026 07:28:00 GMT',
            'another=2',
          ],
        },
      } as unknown as Response
      expect(extractSessionCookie(res)).toBe('presenton_session=abc')
    })

    it('returns null when no session cookie was set', () => {
      const res = { headers: { getSetCookie: () => ['other=1'] } } as unknown as Response
      expect(extractSessionCookie(res)).toBeNull()
    })
  })
})
