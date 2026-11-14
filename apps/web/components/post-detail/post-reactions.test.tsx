import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PostReactions } from '@/components/post-detail/post-reactions'

const react = vi.fn()
const toastError = vi.fn()
let auth = { isAuthenticated: true }

vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ setQueryData: vi.fn() }) }))
vi.mock('sonner', () => ({ toast: { error: (m: string) => toastError(m) } }))
vi.mock('@/contexts/auth-context', () => ({ useAuth: () => auth }))
vi.mock('@/src/lib/api/generated/posts/posts', () => ({
  usePostsControllerReact: () => ({ mutate: react }),
  getPostsControllerFindOneQueryKey: (id: string) => ['post', id],
}))

const post = (extra: Record<string, unknown> = {}) =>
  ({ id: 'p1', reactionCounts: {}, userReaction: null, ...extra }) as unknown as Parameters<
    typeof PostReactions
  >[0]['post']

beforeEach(() => {
  react.mockClear()
  toastError.mockClear()
  auth = { isAuthenticated: true }
})

describe('PostReactions', () => {
  it('shows Helpful plus only the types that have counts', () => {
    render(<PostReactions post={post({ reactionCounts: { LOVE: 2, FIRE: 0 } })} />)
    const names = screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))
    expect(names).toEqual(['Helpful', 'Love', 'Add a reaction'])
    expect(screen.queryByText(/reactions/)).not.toBeInTheDocument()
  })

  it('lists all six types in the picker and reacts on choosing one', async () => {
    const user = userEvent.setup()
    render(<PostReactions post={post()} />)
    await user.click(screen.getByRole('button', { name: 'Add a reaction' }))
    const picker = document.querySelector('[data-slot="popover-content"]') as HTMLElement
    expect(within(picker).getAllByRole('button')).toHaveLength(6)

    await user.click(within(picker).getByRole('button', { name: 'Fire' }))
    await waitFor(() => expect(react).toHaveBeenCalled(), { timeout: 2000 })
    expect(react.mock.calls[0][0]).toMatchObject({ id: 'p1', data: { type: 'FIRE' } })
    expect(document.querySelector('[data-slot="popover-content"]')).not.toBeInTheDocument()
  })

  it('marks the chosen type in the picker', async () => {
    const user = userEvent.setup()
    render(<PostReactions post={post({ userReaction: 'WOW', reactionCounts: { WOW: 1 } })} />)
    await user.click(screen.getByRole('button', { name: 'Add a reaction' }))
    const picker = document.querySelector('[data-slot="popover-content"]') as HTMLElement
    expect(within(picker).getByRole('button', { name: 'Wow' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('tells a guest to sign in', async () => {
    auth = { isAuthenticated: false }
    const user = userEvent.setup()
    render(<PostReactions post={post()} />)
    await user.click(screen.getByRole('button', { name: 'Add a reaction' }))
    const picker = document.querySelector('[data-slot="popover-content"]') as HTMLElement
    await user.click(within(picker).getByRole('button', { name: 'Love' }))
    expect(toastError).toHaveBeenCalledWith('Sign in to react')
    expect(react).not.toHaveBeenCalled()
  })

  it('closes the picker on Escape and returns focus to the button', async () => {
    const user = userEvent.setup()
    render(<PostReactions post={post()} />)
    const open = screen.getByRole('button', { name: 'Add a reaction' })
    await user.click(open)
    expect(open).toHaveAttribute('aria-expanded', 'true')
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    await waitFor(() => expect(open).toHaveAttribute('aria-expanded', 'false'))
    expect(open).toHaveFocus()
  })
})
