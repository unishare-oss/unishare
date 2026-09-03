import type { ConfigService } from '@nestjs/config'
import {
  PresentonClient,
  describeProviderFailure,
  describeTaskError,
  phaseFor,
  templateItems,
} from './presenton.client'
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
describe('phaseFor', () => {
  /**
   * These inputs are the generator's own UI copy, captured from a live run. They are matched
   * loosely on purpose: the vendor rewords them, and a phase that silently stops matching
   * would leave the UI stuck on whatever it last recognised.
   */
  it.each([
    ['Queued for generation', 'starting'],
    ['Starting presentation generation', 'starting'],
    ['Generating presentation outlines', 'outline'],
    ['Selecting layout for each slide', 'layout'],
    ['Generating slides', 'slides'],
    ['Fetching assets for slides', 'assets'],
    ['Presentation generation completed', 'finishing'],
  ])('maps %s to %s', (message, expected) => {
    expect(phaseFor(message)).toBe(expected)
  })

  it('returns null for a message it does not recognise', () => {
    // Null so the caller keeps the last known phase. Guessing here would be worse than
    // saying nothing: an unrecognised message means the vendor changed something, and
    // inventing a phase from it would move the UI backwards.
    expect(phaseFor('Reticulating splines')).toBeNull()
    expect(phaseFor('')).toBeNull()
    expect(phaseFor(null)).toBeNull()
  })

  it('prefers the asset phase over the slide phase when a message mentions both', () => {
    // "Fetching assets for slides" contains both words, and it arrives AFTER the slides are
    // written. Matching "slide" first would make the UI go backwards at the very end.
    expect(phaseFor('Fetching assets for slides')).toBe('assets')
  })
})

describe('describeTaskError', () => {
  it('reads a rate limit the same way a failed request would', () => {
    // The whole point: moving generation to the async endpoint must not change what a
    // student sees for the failure that actually happens.
    expect(describeTaskError({ error: { status_code: 429, detail: 'Rate limit exceeded' } })).toBe(
      describeProviderFailure(429, ''),
    )
  })

  it('accepts a status code that arrives as a string', () => {
    expect(describeTaskError({ error: { status: '503' } })).toBe(describeProviderFailure(503, ''))
  })

  it("falls back to the payload's own words when there is no status", () => {
    expect(describeTaskError({ error: { detail: 'Template not found' } })).toBe(
      'Template not found',
    )
  })

  it('falls back to the task message when the error carries nothing usable', () => {
    expect(describeTaskError({ error: {}, message: 'Presentation generation failed' })).toBe(
      'Presentation generation failed',
    )
  })

  it('never returns an empty string', () => {
    expect(describeTaskError({})).toMatch(/\S/)
    expect(describeTaskError({ error: null, message: '   ' })).toMatch(/\S/)
  })
})

/**
 * The template endpoint is paginated. Reading its body as an array returned nothing for every
 * request, so the create form's picker was empty and every deck fell back to `general` --
 * verified against the instance, which offers 8 templates, and against the database, where
 * all 13 decks generated to that point had `template = 'general'`.
 */
describe('templateItems', () => {
  it('unwraps the paginated body the instance actually returns', () => {
    const body = {
      items: [{ id: 'executive' }, { id: 'dynamic' }],
      total: 8,
      page: 1,
      page_size: 50,
    }
    expect(templateItems(body)).toEqual([{ id: 'executive' }, { id: 'dynamic' }])
  })

  it('still accepts a bare array, in case the shape changes back', () => {
    expect(templateItems([{ id: 'general' }])).toEqual([{ id: 'general' }])
  })

  it('reports an empty page as empty rather than unreadable', () => {
    expect(templateItems({ items: [], total: 0 })).toEqual([])
  })

  /**
   * Null, not `[]`. The caller logs on null; returning `[]` for an unreadable body is exactly
   * the silent failure this replaced.
   */
  it.each([null, undefined, {}, { items: 'nope' }, 'string', 42])(
    'returns null for an unreadable body: %p',
    (body) => {
      expect(templateItems(body)).toBeNull()
    },
  )
})

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
