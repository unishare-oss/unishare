import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { ApiPost } from '@/lib/api-types'
import { PostFeed } from './post-feed'

vi.mock('@/contexts/auth-context', () => ({ useAuth: () => ({ isAuthenticated: false }) }))
vi.mock('@/hooks/use-toggle-saved-post', () => ({
  useToggleSavedPost: () => ({ isSaved: false, toggle: () => undefined }),
}))

afterEach(cleanup)

const post = {
  id: 'p-1',
  type: 'NOTE',
  title: 'Hash tables',
  createdAt: new Date().toISOString(),
  isOwner: false,
  author: { id: 'u-1', name: 'Arthit K.', image: null },
  course: { id: 'c-1', code: 'CSC213' },
  files: [{ id: 'f-1', name: 'hash.pdf' }],
  tags: [],
  reactionCounts: { LIKE: 20, FIRE: 4 },
  _count: { comments: 6, savedBy: 18 },
} as unknown as ApiPost

describe('PostFeed', () => {
  it('renders the post card', () => {
    render(<PostFeed posts={[post]} page={1} totalPages={1} onPageChange={() => {}} />)
    expect(screen.getByRole('link', { name: 'Hash tables' })).toHaveAttribute('href', '/posts/p-1')
    expect(screen.getByText('Note')).toBeInTheDocument()
    expect(screen.getByText('hash.pdf')).toBeInTheDocument()
    expect(screen.getByLabelText('24 likes')).toBeInTheDocument()
    expect(screen.getByLabelText('6 comments')).toBeInTheDocument()
    expect(screen.getByLabelText('18 saves')).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(1)
  })

  it('shows the empty state with no posts', () => {
    render(<PostFeed posts={[]} page={1} totalPages={1} onPageChange={() => {}} />)
    expect(screen.getByText('No posts found')).toBeInTheDocument()
  })
})
