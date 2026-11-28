import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PostCard } from '@/components/post-card'
import type { ApiPost } from '@/lib/api-types'

const mocks = vi.hoisted(() => ({
  isAuthenticated: true,
  isSaved: false,
  toggleSaved: vi.fn(),
  markRead: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ isAuthenticated: mocks.isAuthenticated }),
}))
vi.mock('@/hooks/use-toggle-saved-post', () => ({
  useToggleSavedPost: () => ({ isSaved: mocks.isSaved, toggle: mocks.toggleSaved }),
}))
vi.mock('@/lib/store', () => ({
  useUIStore: (select: (s: object) => unknown) =>
    select({ readPostIds: [], markRead: mocks.markRead }),
}))
vi.mock('@/components/ReportDialog', () => ({
  ReportDialog: ({ open }: { open?: boolean }) =>
    open ? <div role="dialog">Report post</div> : <button aria-label="Report post" />,
}))
vi.mock('sonner', () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError } }))

const post = {
  id: 'p1',
  shortCode: 'abc123',
  title: 'Linear algebra notes',
  type: 'NOTE',
  isOwner: false,
  savedByCurrentUser: false,
  createdAt: new Date().toISOString(),
  author: { id: 'u1', name: 'Ada', image: null },
  course: { code: 'MTH101' },
  files: [],
  reactionCounts: {},
  _count: { comments: 0, savedBy: 0 },
} as unknown as ApiPost

async function openMenu() {
  fireEvent.contextMenu(screen.getByRole('article'))
  return screen.findByRole('menu')
}

describe('PostCard right-click menu', () => {
  beforeEach(() => {
    mocks.isAuthenticated = true
    mocks.isSaved = false
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('opens the post in a new tab and marks it read', async () => {
    const open = vi.fn()
    vi.stubGlobal('open', open)
    render(<PostCard post={post} />)

    await openMenu()
    await userEvent.click(screen.getByRole('menuitem', { name: 'Open in new tab' }))

    expect(open).toHaveBeenCalledWith('/posts/p1', '_blank', 'noopener')
    expect(mocks.markRead).toHaveBeenCalledWith('p1')
  })

  it('copies the short link and says so', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    render(<PostCard post={post} />)

    await openMenu()
    await user.click(screen.getByRole('menuitem', { name: 'Copy link' }))

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/s/abc123`)
    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith('Link copied'))
  })

  it('saves an unsaved post, and offers to remove a saved one', async () => {
    const { unmount } = render(<PostCard post={post} />)
    await openMenu()
    await userEvent.click(screen.getByRole('menuitem', { name: 'Save' }))
    expect(mocks.toggleSaved).toHaveBeenCalledTimes(1)
    unmount()

    mocks.isSaved = true
    render(<PostCard post={post} />)
    await openMenu()
    expect(screen.getByRole('menuitem', { name: 'Remove from saved' })).toBeInTheDocument()
  })

  it('opens the report dialog from the menu', async () => {
    render(<PostCard post={post} />)

    await openMenu()
    await userEvent.click(screen.getByRole('menuitem', { name: 'Report' }))

    expect(await screen.findByRole('dialog')).toHaveTextContent('Report post')
  })

  it.each([
    ['a guest', { isAuthenticated: false }, post],
    ['the author of the post', {}, { ...post, isOwner: true } as ApiPost],
  ])('offers no report option to %s', async (_who, state, card) => {
    Object.assign(mocks, state)
    render(<PostCard post={card} />)

    await openMenu()

    expect(screen.queryByRole('menuitem', { name: 'Report' })).toBeNull()
    expect(screen.getByRole('menuitem', { name: 'Copy link' })).toBeInTheDocument()
  })
})

describe('PostCard hover', () => {
  it('lifts the card on hover and keyboard focus, not by underlining the title', () => {
    render(<PostCard post={post} />)

    const card = screen.getByRole('article')
    expect(card.className).toContain('hover:-translate-y-0.5')
    expect(card.className).toContain('has-[a:focus-visible]:shadow-lift')
    expect(card.className).toContain('motion-reduce:hover:translate-y-0')
    expect(screen.getByRole('link', { name: 'Linear algebra notes' }).className).not.toContain(
      'hover:underline',
    )
  })
})
