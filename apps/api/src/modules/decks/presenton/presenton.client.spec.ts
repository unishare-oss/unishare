import type { ConfigService } from '@nestjs/config'
import { PresentonClient, describeProviderFailure } from './presenton.client'
import type { PresentonAccountsService } from './presenton-accounts.service'

/**
 * The error text on a deck is rendered to the student verbatim, so it is part of the UI.
 * Before this, a rate-limited deck showed:
 *   Deck generation failed (429): {"detail":"AI provider API request is temporarily rate
 *   limited. Please wait and try again."}
 * — raw JSON, an HTTP status, and an instruction that contradicts the retry we are already
 * doing on their behalf.
 */
describe('describeProviderFailure', () => {
  const rateLimited = JSON.stringify({
    detail: 'AI provider API request is temporarily rate limited. Please wait and try again.',
  })

  it('never leaks JSON or a status code', () => {
    for (const status of [429, 503, 500, 418]) {
      const msg = describeProviderFailure(status, rateLimited)
      expect(msg).not.toMatch(/[{}]/)
      expect(msg).not.toContain(String(status))
      expect(msg).not.toContain('"detail"')
    }
  })

  it('does not tell the student to retry when we retry for them', () => {
    expect(describeProviderFailure(429, rateLimited)).not.toMatch(/try again/i)
  })

  it('distinguishes a usage limit from an outage', () => {
    expect(describeProviderFailure(429, '')).toMatch(/usage limit/i)
    expect(describeProviderFailure(503, '')).toMatch(/unavailable/i)
  })

  it('does not imply a 429 clears shortly', () => {
    // The generator collapses per-minute and per-day limits into one 429; a free-tier daily
    // cap does not clear by waiting, so the copy must not suggest it does.
    const msg = describeProviderFailure(429, '')
    expect(msg).not.toMatch(/shortly|soon|moment|right now/i)
  })

  it('flags a credentials problem as needing an administrator', () => {
    expect(describeProviderFailure(401, '')).toMatch(/administrator/i)
  })

  it('falls back to the provider wording only for unrecognised statuses', () => {
    const msg = describeProviderFailure(418, JSON.stringify({ detail: 'Teapot is steeping' }))
    expect(msg).toBe('Teapot is steeping')
  })

  it('survives a non-JSON body', () => {
    expect(describeProviderFailure(599, '<html>gateway</html>')).toMatch(/unexpected error/i)
  })
})

/**
 * deletePresentation is the one call in this client that reports failure by resolving.
 * Everything that depends on it — a student's delete — has already been committed to the
 * database by the time it runs, so a throw here would report "could not delete" for a deck
 * that is definitively gone, and a retry would then say "Deck not found".
 */
describe('PresentonClient.deletePresentation', () => {
  const config = {
    get: (key: string) =>
      ({ PRESENTON_BASE_URL: 'http://presenton', PRESENTON_API_KEY: 'sk-test' })[key],
  } as unknown as ConfigService

  // The client brokers a per-student session for every deck-scoped call; the fake returns a
  // fixed cookie so the assertions below are about what reaches the generator.
  const accounts = {
    sessionFor: jest.fn().mockResolvedValue('presenton_session=abc'),
    invalidate: jest.fn().mockResolvedValue(undefined),
  } as unknown as PresentonAccountsService

  const client = () => new PresentonClient(config, accounts)
  const fetchMock = () => globalThis.fetch as unknown as jest.Mock

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('sends a DELETE for the presentation with our credentials', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 }) as never
    await client().deletePresentation('ext-1', 'user-1')

    const [url, init] = fetchMock().mock.calls[0]
    expect(url).toBe('http://presenton/api/v1/ppt/presentation/ext-1')
    expect(init.method).toBe('DELETE')
    // Acts as the owner, not as the admin key: the generator 404s a deck the caller does not own.
    expect(init.headers.Cookie).toBe('presenton_session=abc')
    expect(init.headers.Authorization).toBeUndefined()
  })

  it('resolves when the generator is unreachable', async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as never
    await expect(client().deletePresentation('ext-1', 'user-1')).resolves.toBeUndefined()
  })

  it('resolves when the generator rejects the request', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as never
    await expect(client().deletePresentation('ext-1', 'user-1')).resolves.toBeUndefined()
  })

  it('resolves when the client is not configured at all', async () => {
    // credentials() throws for a missing base URL. Local development runs without a reachable
    // generator, and a delete must still work there.
    const unconfigured = new PresentonClient(
      { get: () => undefined } as unknown as ConfigService,
      accounts,
    )
    await expect(unconfigured.deletePresentation('ext-1', 'user-1')).resolves.toBeUndefined()
  })
})
