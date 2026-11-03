import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const mocks = vi.hoisted(() => ({ auth: { isAuthenticated: true, isGuest: false } }))
vi.mock('@/contexts/auth-context', () => ({ useAuth: () => mocks.auth }))

const { FeedHeader } = await import('./feed-header')

describe('FeedHeader', () => {
  beforeEach(() => {
    mocks.auth = { isAuthenticated: true, isGuest: false }
  })
  const renderHeader = () =>
    render(
      <QueryClientProvider client={new QueryClient()}>
        <FeedHeader searchQuery="" onSearchChange={() => {}} onTagSelect={() => {}} />
      </QueryClientProvider>,
    )

  it('offers a member the new-post button', () => {
    renderHeader()
    expect(screen.getByRole('link', { name: /New Post/ })).toHaveAttribute('href', '/posts/new')
  })

  it('hides the new-post button from a guest, who browses read-only', () => {
    mocks.auth = { isAuthenticated: false, isGuest: true }
    renderHeader()
    expect(screen.queryByRole('link', { name: /New Post/ })).not.toBeInTheDocument()
  })
})
