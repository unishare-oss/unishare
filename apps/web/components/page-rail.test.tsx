import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageRail } from '@/components/page-rail'

describe('PageRail', () => {
  it('puts the 320px rail beside the page from 1180px and stacks it below', () => {
    render(
      <PageRail rail={<p>Rail card</p>}>
        <p>Page body</p>
      </PageRail>,
    )
    const rail = screen.getByRole('complementary', { name: 'Page details' })
    expect(rail).toContainElement(screen.getByText('Rail card'))
    expect(rail.parentElement).toHaveClass('min-[1180px]:grid-cols-[minmax(0,1fr)_320px]')
    expect(screen.getByText('Page body')).toBeInTheDocument()
  })
})
