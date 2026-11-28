import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { YourStuff } from '@/components/profile/your-stuff'

const mocks = vi.hoisted(() => ({ role: 'STUDENT' }))

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ session: { user: { role: mocks.role } } }),
}))
vi.mock('@/src/lib/auth/sign-out', () => ({ signOut: vi.fn() }))
vi.mock('@/components/feedback/feedback-dialog', () => ({ FeedbackDialog: () => null }))

describe('YourStuff', () => {
  beforeEach(() => {
    mocks.role = 'STUDENT'
  })

  it('lists Your stuff links', () => {
    render(<YourStuff />)
    const expected = {
      'My Posts': '/my-posts',
      Requests: '/requests',
      Decks: '/decks',
      Analytics: '/analytics',
      Quizzes: '/quizzes',
    }
    for (const [label, href] of Object.entries(expected)) {
      expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', href)
    }
  })

  it('keeps what the old More drawer held on phones', () => {
    render(<YourStuff />)
    for (const label of ['Calendar', 'Boards', 'Saved', 'Appearance']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Feedback or bug report' })).toBeInTheDocument()
    expect(screen.queryByText('Moderation')).not.toBeInTheDocument()
  })

  it('shows Moderation for moderators', () => {
    mocks.role = 'MODERATOR'
    render(<YourStuff />)
    expect(screen.getByRole('link', { name: 'Reports' })).toHaveAttribute('href', '/admin/reports')
    expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument()
  })
})
