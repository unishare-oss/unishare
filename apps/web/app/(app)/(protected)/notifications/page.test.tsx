import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import NotificationsPage from './page'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  markOneRead: vi.fn(),
  data: [] as Record<string, unknown>[],
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ setQueryData: vi.fn() }) }))
vi.mock('@/src/lib/api/generated/notifications/notifications', () => ({
  useNotificationsControllerFindAll: () => ({ data: mocks.data, isLoading: false }),
  useNotificationsControllerMarkOneRead: () => ({ mutate: mocks.markOneRead }),
  useNotificationsControllerMarkAllRead: () => ({ mutate: vi.fn(), isPending: false }),
  getNotificationsControllerFindAllQueryKey: () => ['notifications'],
}))
vi.mock('@/components/shared/page-header', () => ({ PageHeader: () => null }))

const base = {
  read: true,
  postId: null,
  requestId: null,
  chatRoomId: null,
  examId: null,
  commentId: null,
  createdAt: new Date().toISOString(),
}

describe('NotificationsPage', () => {
  beforeEach(() => {
    mocks.push.mockClear()
  })

  it('labels a MENTION "Mention" and opens the comment on click', () => {
    mocks.data = [
      {
        ...base,
        id: 'n1',
        type: 'MENTION',
        message: 'Jane mentioned you in a comment on "Notes".',
        postId: 'p1',
        commentId: 'c1',
      },
    ]
    render(<NotificationsPage />)

    expect(screen.getByText('Mention')).toBeInTheDocument()
    fireEvent.click(screen.getByText(/Jane mentioned you/))
    expect(mocks.push).toHaveBeenCalledWith('/posts/p1#comment-c1')
  })

  it('opens a plain post for a notification without a comment', () => {
    mocks.data = [{ ...base, id: 'n2', type: 'POST_APPROVED', message: 'Approved', postId: 'p2' }]
    render(<NotificationsPage />)

    fireEvent.click(screen.getByText('Approved', { selector: 'p' }))
    expect(mocks.push).toHaveBeenCalledWith('/posts/p2')
  })
})
