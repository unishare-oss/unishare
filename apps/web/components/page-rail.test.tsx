import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageRail } from '@/components/page-rail'

describe('PageRail', () => {
  it('renders the main column and the rail', () => {
    render(<PageRail rail={<p>Rail content</p>}>Main content</PageRail>)
    const main = screen.getByText('Main content')
    const rail = screen.getByRole('complementary')
    expect(rail).toHaveTextContent('Rail content')
    expect(main.compareDocumentPosition(rail) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('has no complementary region without a rail', () => {
    render(<PageRail>Main content</PageRail>)
    expect(screen.getByText('Main content')).toBeInTheDocument()
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })
})
