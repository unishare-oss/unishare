import { describe, expect, it, vi, afterEach } from 'vitest'
import { ApiError, customFetch } from './fetcher'

/**
 * Guards the error boundary every generated API hook throws through.
 *
 * This file exists because of a surviving mutant: reverting `throw new ApiError(msg, status)` to
 * `throw new Error(msg)` passed the entire `use-post-ai-chat` suite, since those tests construct
 * an `ApiError` themselves and inject it into a mocked mutation. They assert what the hook does
 * WITH a status, never that a real response produces one — so the status could silently stop
 * being attached and every caller would quietly fall back to its generic message.
 */
function jsonResponse(status: number, body: unknown, headers = new Headers()): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers,
    json: async () => body,
  } as unknown as Response
}

describe('customFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('throws an ApiError carrying the HTTP status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse(503, { success: false, message: 'AI service not configured' }),
      ),
    )

    // `rejects.toThrow(ApiError)` alone would pass against a plain Error subclassing check in
    // some runners, so the status is asserted on the caught value directly.
    const error = await customFetch('/api/x').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(503)
    expect((error as ApiError).message).toBe('AI service not configured')
  })

  it.each([403, 500])('preserves status %i rather than flattening it', async (status) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(status, { success: false, message: 'nope' })),
    )

    const error = await customFetch('/api/x').catch((e: unknown) => e)

    expect((error as ApiError).status).toBe(status)
  })

  it('is still an Error, so existing catch blocks reading .message keep working', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(500, { success: false, message: 'boom' })),
    )

    const error = await customFetch('/api/x').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toBe('boom')
  })

  it('unwraps the envelope by exactly one level on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(200, { success: true, message: 'OK', data: { reply: 'hi' } })),
    )

    const result = await customFetch<{ data: { reply: string } }>('/api/x')

    // One level, not two: `data` holds the payload itself. Unwrapping twice is the bug that
    // shipped in use-ai-index-status.ts and survived 5/5 mutations there.
    expect(result.data).toEqual({ reply: 'hi' })
  })

  it('carries the trace id from the error body so users can report an Error ID', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(500, { success: false, message: 'boom', trace_id: 'abc123' })),
    )

    const error = await customFetch('/api/x').catch((e: unknown) => e)

    expect((error as ApiError).traceId).toBe('abc123')
  })

  it('falls back to the X-Trace-Id header when the body has no trace id', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse(
          502,
          { success: false, message: 'bad gateway' },
          new Headers({ 'X-Trace-Id': 'def456' }),
        ),
      ),
    )

    const error = await customFetch('/api/x').catch((e: unknown) => e)

    expect((error as ApiError).traceId).toBe('def456')
  })
})
