import { afterEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { ApiError } from './fetcher'
import { reportServerError } from './report-server-error'

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

describe('reportServerError', () => {
  afterEach(() => {
    vi.mocked(toast.error).mockClear()
  })

  it('shows the trace id as a copyable Error ID for server errors', async () => {
    const writeText = vi.fn(async () => undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    reportServerError(new ApiError('boom', 500, 'abc123'))

    expect(toast.error).toHaveBeenCalledTimes(1)
    const [, options] = vi.mocked(toast.error).mock.calls[0]
    expect(options?.description).toBe('Error ID: abc123')

    const action = options?.action as unknown as { onClick: () => void }
    action.onClick()
    expect(writeText).toHaveBeenCalledWith('abc123')
    vi.unstubAllGlobals()
  })

  it.each([
    ['a 4xx ApiError', new ApiError('not allowed', 403, 'abc123')],
    ['a 5xx without a trace id', new ApiError('boom', 500)],
    ['a plain Error', new Error('boom')],
  ])('stays silent for %s', (_label, error) => {
    reportServerError(error)

    expect(toast.error).not.toHaveBeenCalled()
  })
})
