import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { renderWithMentions } from '@/lib/render-with-mentions'
import { mentionIdsIn } from '@/lib/mentions'

const jane = { id: 'u1', name: 'Jane Doe' }

describe('renderWithMentions', () => {
  it('marks a mentioned @Name as semibold primary', () => {
    render(<p>{renderWithMentions('hi @Jane Doe!', [jane])}</p>)
    const el = screen.getByText('@Jane Doe')
    expect(el).toHaveClass('font-semibold', 'text-primary')
  })

  it('leaves an email address and an unlisted @name plain', () => {
    render(<p>{renderWithMentions('mail email@Jane Doe and @Bob', [jane])}</p>)
    expect(document.querySelector('.font-semibold')).toBeNull()
  })

  it('still turns a URL into a link', () => {
    render(<p>{renderWithMentions('@Jane Doe see https://example.com', [jane], 'text-primary')}</p>)
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://example.com')
    expect(screen.getByText('@Jane Doe')).toHaveClass('font-semibold')
  })

  it('escapes regex characters in names', () => {
    const odd = { id: 'u2', name: 'A.B (x)' }
    render(<p>{renderWithMentions('@A.B (x) and @AxB (x)', [odd])}</p>)
    expect(document.querySelectorAll('.font-semibold')).toHaveLength(1)
  })
})

describe('mentionIdsIn', () => {
  it('keeps only picked people whose @Name is still in the text, once each', () => {
    const bob = { id: 'u3', name: 'Bob' }
    expect(mentionIdsIn('hey @Jane Doe', [jane, jane, bob])).toEqual(['u1'])
  })
})
