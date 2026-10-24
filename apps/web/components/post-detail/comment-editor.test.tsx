import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CommentSection } from '@/components/post-detail/comment-section'

const mocks = vi.hoisted(() => ({ update: vi.fn() }))

const comment = {
  id: 'c1',
  content: 'hi @Bea Lee thanks',
  userId: 'a',
  postId: 'p1',
  parentId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  user: { id: 'a', name: 'Amy', image: null },
  mentions: [{ id: 'b', name: 'Bea Lee' }],
  children: [],
}

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ user: { id: 'a', role: 'STUDENT' }, isAuthenticated: true }),
}))
vi.mock('@/hooks/use-scroll-to-hash-comment', () => ({ useScrollToHashComment: () => undefined }))
vi.mock('@/src/lib/api/generated/follows/follows', () => ({
  useFollowsControllerGetMentionable: (params: { q?: string }, options: { query: any }) => {
    const all = [{ id: 'k', name: 'Kai Ono', image: null }]
    const data = options.query.enabled
      ? all.filter((u) => u.name.toLowerCase().startsWith((params.q ?? '').toLowerCase()))
      : undefined
    return { data: data && options.query.select({ data }) }
  },
}))
vi.mock('@/src/lib/api/generated/comments/comments', () => {
  const idle = () => ({ mutateAsync: vi.fn(), isPending: false })
  return {
    getCommentsControllerFindAllQueryKey: (postId: string) => ['comments', postId],
    useCommentsControllerFindAll: (_postId: string, options: { query: any }) => ({
      data: options.query.select({ data: [comment] }),
      isLoading: false,
    }),
    useCommentsControllerCreate: idle,
    useCommentsControllerCreateReply: idle,
    useCommentsControllerRemove: idle,
    useCommentsControllerUpdate: () => ({ mutateAsync: mocks.update, isPending: false }),
  }
})

function renderSection() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CommentSection postId="p1" postAuthorId="a" />
    </QueryClientProvider>,
  )
}

describe('editing a comment with mentions', () => {
  beforeEach(() => mocks.update.mockReset().mockResolvedValue({}))

  it('starts from the comment mentions, so saving unchanged sends them again', async () => {
    renderSection()
    await userEvent.click(screen.getByRole('button', { name: 'Edit comment' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(mocks.update).toHaveBeenCalledWith({
      postId: 'p1',
      commentId: 'c1',
      data: { content: 'hi @Bea Lee thanks', mentions: ['b'] },
    })
  })

  it('sends an empty list once the @Name is deleted from the text', async () => {
    renderSection()
    await userEvent.click(screen.getByRole('button', { name: 'Edit comment' }))
    const box = screen.getByDisplayValue('hi @Bea Lee thanks')
    await userEvent.clear(box)
    await userEvent.type(box, 'hi there')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { content: 'hi there', mentions: [] } }),
    )
  })

  it('adds a newly picked person next to the existing mention', async () => {
    renderSection()
    await userEvent.click(screen.getByRole('button', { name: 'Edit comment' }))
    await userEvent.type(screen.getByDisplayValue('hi @Bea Lee thanks'), ' @ka')
    await userEvent.click(screen.getByRole('option', { name: /Kai Ono/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { content: 'hi @Bea Lee thanks @Kai Ono', mentions: ['b', 'k'] },
      }),
    )
  })
})
