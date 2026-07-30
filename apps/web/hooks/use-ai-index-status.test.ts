import { describe, expect, it, vi, beforeEach } from 'vitest'

const usePostsControllerGetAiIndexStatus = vi.fn(() => ({ data: undefined, isLoading: false }))

vi.mock('@/src/lib/api/generated/posts/posts', () => ({
  usePostsControllerGetAiIndexStatus: (...args: unknown[]) =>
    usePostsControllerGetAiIndexStatus(...(args as [])),
}))

const { useAiIndexStatus, POLL_INTERVAL_MS } = await import('./use-ai-index-status')

/**
 * The hook body calls nothing but the mocked generated hook, so it can be invoked directly —
 * no renderHook, no QueryClient.
 */
function optionsFor(postId = 'post-1', enabled?: boolean) {
  usePostsControllerGetAiIndexStatus.mockClear()
  if (enabled === undefined) useAiIndexStatus(postId)
  else useAiIndexStatus(postId, enabled)
  const [id, config] = usePostsControllerGetAiIndexStatus.mock.calls[0] as unknown as [
    string,
    { query: Record<string, any> },
  ]
  return { id, query: config.query }
}

/** Shapes the raw envelope the way TanStack Query hands it to refetchInterval. */
const envelope = (state?: string) =>
  ({ state: { data: state === undefined ? undefined : { data: { state } } } }) as any

describe('useAiIndexStatus', () => {
  beforeEach(() => {
    usePostsControllerGetAiIndexStatus.mockClear()
  })

  it('polls every 4s while preparing', () => {
    const { query } = optionsFor()

    expect(query.refetchInterval(envelope('preparing'))).toBe(POLL_INTERVAL_MS)
    expect(POLL_INTERVAL_MS).toBe(4000)
  })

  it('stops polling once the state settles', () => {
    const { query } = optionsFor()

    // An endpoint hit every 4s forever on an idle post page is a real cost — it runs a count
    // query — so every terminal state must return false, not a number.
    for (const state of ['ready', 'failed', 'unsupported']) {
      expect(query.refetchInterval(envelope(state))).toBe(false)
    }
  })

  it('does not poll before the first response, or when it errored', () => {
    const { query } = optionsFor()

    // A 404 or an in-flight first fetch leaves data undefined.
    expect(query.refetchInterval(envelope(undefined))).toBe(false)
    expect(query.refetchInterval({ state: {} } as any)).toBe(false)
  })

  it('reads state through the raw envelope, not the selected value', () => {
    const { query } = optionsFor()

    // `select` is applied per-observer and never reaches the refetch scheduler, so the closure
    // must dig through `data.data`. Reading the selected shape would return false and silently
    // freeze the count on screen with no error anywhere.
    expect(query.refetchInterval({ state: { data: { state: 'preparing' } } } as any)).toBe(false)
    expect(query.select({ data: { state: 'preparing', indexedChunks: 7 } } as any)).toEqual({
      state: 'preparing',
      indexedChunks: 7,
    })
  })

  it('passes the post id through and gates the query on the enabled flag', () => {
    expect(optionsFor('abc').id).toBe('abc')
    expect(optionsFor('abc', true).query.enabled).toBe(true)
    expect(optionsFor('abc', false).query.enabled).toBe(false)
    // No post id means nothing to ask about.
    expect(optionsFor('', true).query.enabled).toBe(false)
  })
})
