import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { PostSummary } from '@/components/post-detail/post-summary'

const render_ = (summary: string) =>
  render(<PostSummary post={{ summary } as Parameters<typeof PostSummary>[0]['post']} />)

describe('PostSummary', () => {
  it('shows the intro and renders bullet lines as a list', () => {
    render_('How hash tables work.\n• Chaining\n• Open addressing')
    expect(screen.getByText('How hash tables work.')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Chaining',
      'Open addressing',
    ])
    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument()
  })

  it('collapses a long summary behind a Show more link', () => {
    render_('Intro\n• a\n• b\n• c\n• d\n• e')
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    fireEvent.click(screen.getByRole('button', { name: 'Show more' }))
    expect(screen.getAllByRole('listitem')).toHaveLength(5)
    expect(screen.getByRole('button', { name: 'Show less' })).toBeInTheDocument()
  })
})
