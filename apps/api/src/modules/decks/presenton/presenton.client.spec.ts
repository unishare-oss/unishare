import { describeProviderFailure } from './presenton.client'

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
