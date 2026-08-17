import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AiReply } from '@/components/post-detail/ai-reply'

/**
 * A streamed reply re-renders this component on every delta, which means it is asked to render
 * markdown that is not finished yet — a `**` with no closing pair, a list item mid-word, a code
 * fence that has only been opened. None of those may throw, and none may drop the text that has
 * already arrived: a student watching an answer appear must never see it vanish.
 */
describe('AiReply while a reply is still streaming', () => {
  it.each([
    ['an unclosed bold marker', '**Eigenvalues'],
    ['an unclosed italic marker', '*Eigenvalues'],
    ['an unclosed inline code span', 'The symbol `λ'],
    ['an opened code fence', '```\nAv = '],
    ['a list item mid-word', '- Eigenval'],
    ['an unclosed link', 'See [the notes'],
    ['a lone hash', '#'],
    ['a lone backslash', 'a \\'],
  ])('renders %s without throwing', (_label, partial) => {
    expect(() => render(<AiReply>{partial}</AiReply>)).not.toThrow()
  })

  it('keeps the words that have arrived while the markup is still incomplete', () => {
    // The failure this rules out is text disappearing and reappearing as the syntax completes.
    const { container, rerender } = render(<AiReply>{'**Eigenvalues'}</AiReply>)
    expect(container.textContent).toContain('Eigenvalues')

    rerender(<AiReply>{'**Eigenvalues** are scalars'}</AiReply>)
    expect(container.textContent).toContain('Eigenvalues')
    expect(container.textContent).toContain('are scalars')
  })

  it('resolves the markup once the closing marker arrives', () => {
    render(<AiReply>{'**Eigenvalues** are scalars'}</AiReply>)

    // Bold is applied at the end of the stream, not merely tolerated at the start of it.
    expect(screen.getByText('Eigenvalues').tagName).toBe('STRONG')
  })

  it('renders nothing rather than failing on an empty reply', () => {
    // The state the bubble is in between being created and the first delta landing.
    const { container } = render(<AiReply>{''}</AiReply>)
    expect(container.textContent).toBe('')
  })
})
