import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FeedHeader } from './feed-header'

describe('FeedHeader', () => {
  const renderHeader = () =>
    render(
      <QueryClientProvider client={new QueryClient()}>
        <FeedHeader searchQuery="" onSearchChange={() => {}} onTagSelect={() => {}} />
      </QueryClientProvider>,
    )

  it('offers the search box', () => {
    renderHeader()
    expect(screen.getByPlaceholderText('Search posts or #tags')).toBeInTheDocument()
  })

  it('has no Feed heading and no new-post button; the shell shares notes', () => {
    renderHeader()
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /New Post/ })).not.toBeInTheDocument()
  })
})
