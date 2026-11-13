import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SupportPage from './page'

describe('SupportPage', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('shows the quick answers and the GitHub issues links', () => {
    render(<SupportPage />)
    expect(screen.getByRole('heading', { name: 'Support' })).toBeInTheDocument()
    expect(screen.getByText('How do I report a post?')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open an issue' })).toHaveAttribute(
      'href',
      'https://github.com/unishare-oss/unishare/issues/new/choose',
    )
  })

  it('hides the status section until STATUS_PAGE_URL is set', () => {
    vi.stubEnv('STATUS_PAGE_URL', '')
    const { unmount } = render(<SupportPage />)
    expect(screen.queryByRole('link', { name: 'status page' })).toBeNull()
    unmount()

    vi.stubEnv('STATUS_PAGE_URL', 'https://status.example.com')
    render(<SupportPage />)
    expect(screen.getByRole('link', { name: 'status page' })).toHaveAttribute(
      'href',
      'https://status.example.com',
    )
  })
})
