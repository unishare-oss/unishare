import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ApiPostDetail } from '@/lib/api-types'
import { PostReactions } from './post-reactions'

const mocks = vi.hoisted(() => ({ mutate: vi.fn() }))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ setQueryData: vi.fn() }),
}))

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}))

vi.mock('@/src/lib/api/generated/posts/posts', () => ({
  getPostsControllerFindOneQueryKey: () => ['post'],
  usePostsControllerReact: () => ({ mutate: mocks.mutate }),
}))

const post = {
  id: 'post-id',
  userReaction: null,
  reactionCounts: { LOVE: 3 },
} as unknown as ApiPostDetail

describe('PostReactions like-only action', () => {
  it('shows only the like count and removes the reaction summary and vertical padding', () => {
    const { container } = render(<PostReactions post={post} likeOnly />)

    expect(screen.getByRole('button', { name: 'Like' })).toBeInTheDocument()
    expect(screen.queryByText('3 reactions')).not.toBeInTheDocument()
    expect(container.firstElementChild).toHaveClass('py-0')
    expect(container.firstElementChild).not.toHaveClass('py-4')
  })
})
