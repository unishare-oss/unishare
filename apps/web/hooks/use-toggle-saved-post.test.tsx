import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useToggleSavedPost } from '@/hooks/use-toggle-saved-post'
import type { ApiPost } from '@/lib/api-types'

type Callbacks = { onSuccess: () => void; onError: () => void }

const mocks = vi.hoisted(() => ({
  isAuthenticated: true,
  save: vi.fn(),
  unsave: vi.fn(),
  toggleGuest: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ isAuthenticated: mocks.isAuthenticated }),
}))
vi.mock('@/lib/store', () => ({
  useUIStore: (select: (s: object) => unknown) =>
    select({ toggleSaved: mocks.toggleGuest, savedPosts: [] }),
}))
vi.mock('sonner', () => ({ toast: { error: mocks.toastError } }))
vi.mock('@/src/lib/api/generated/posts/posts', () => ({
  getPostsControllerFindAllQueryKey: () => ['/api/posts'],
  getPostsControllerFindOneQueryKey: (id: string) => ['/api/posts', id],
  getPostsControllerGetSavedPostsQueryKey: () => ['/api/posts/saved'],
  usePostsControllerSavePost: () => ({ mutate: mocks.save }),
  usePostsControllerUnsavePost: () => ({ mutate: mocks.unsave }),
}))

const post = { id: 'p1', savedByCurrentUser: false } as unknown as ApiPost

function setup(client = new QueryClient()) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, ...renderHook(() => useToggleSavedPost(post), { wrapper }) }
}

/** The callbacks of the n-th call to a mutate mock. */
const callbacks = (mock: ReturnType<typeof vi.fn>, n = 0) => mock.mock.calls[n][1] as Callbacks

describe('useToggleSavedPost', () => {
  beforeEach(() => {
    mocks.isAuthenticated = true
    vi.clearAllMocks()
  })

  it('shows the new state at once and holds further toggles until the save has landed', async () => {
    // The refetch is three invalidations, so the test holds all three and releases them together.
    const pendingRefetches: (() => void)[] = []
    const finishRefresh = () => pendingRefetches.splice(0).forEach((resolve) => resolve())
    const client = new QueryClient()
    vi.spyOn(client, 'invalidateQueries').mockImplementation(
      () => new Promise<void>((resolve) => pendingRefetches.push(resolve)),
    )
    const { result } = setup(client)

    act(() => result.current.toggle())
    expect(result.current).toMatchObject({ isSaved: true, pending: true })
    expect(mocks.save).toHaveBeenCalledTimes(1)

    // A second toggle while the save, or its refetch, is still on its way does nothing.
    act(() => result.current.toggle())
    act(() => callbacks(mocks.save).onSuccess())
    act(() => result.current.toggle())
    expect(mocks.unsave).not.toHaveBeenCalled()
    expect(result.current.isSaved).toBe(true)

    await act(async () => finishRefresh())
    expect(result.current.pending).toBe(false)

    // Accepted again once settled. The confirmed save is still what shows, so this one removes it.
    act(() => result.current.toggle())
    expect(mocks.unsave).toHaveBeenCalledTimes(1)
  })

  it('undoes the change and says so when the server refuses it', () => {
    const { result } = setup()

    act(() => result.current.toggle())
    act(() => callbacks(mocks.save).onError())

    expect(result.current).toMatchObject({ isSaved: false, pending: false })
    expect(mocks.toastError).toHaveBeenCalledWith('Could not save post')
  })

  it('keeps the confirmed state when the refetch after it brings no news', async () => {
    const client = new QueryClient()
    // A failed refetch: the client resolves and keeps the old data, which still says "not saved".
    vi.spyOn(client, 'invalidateQueries').mockResolvedValue(undefined)
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const { result, rerender } = renderHook(({ p }) => useToggleSavedPost(p), {
      wrapper,
      initialProps: { p: post },
    })

    act(() => result.current.toggle())
    await act(async () => callbacks(mocks.save).onSuccess())

    expect(result.current).toMatchObject({ isSaved: true, pending: false })

    // Once the post data catches up, it takes over again, and later changes to it show through.
    rerender({ p: { ...post, savedByCurrentUser: true } as ApiPost })
    expect(result.current.isSaved).toBe(true)
    rerender({ p: { ...post, savedByCurrentUser: false } as ApiPost })
    expect(result.current.isSaved).toBe(false)
  })

  it('keeps a guest’s saves in local storage, with no request', () => {
    mocks.isAuthenticated = false
    const { result } = setup()

    act(() => result.current.toggle())

    expect(mocks.toggleGuest).toHaveBeenCalledWith(post)
    expect(mocks.save).not.toHaveBeenCalled()
  })
})
