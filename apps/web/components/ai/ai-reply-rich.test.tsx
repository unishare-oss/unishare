import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AiReply } from '@/components/ai/ai-reply'

describe('AiReply tables', () => {
  const table =
    '| Term | Meaning |\n| --- | --- |\n| Eigenvalue | A scalar |\n| Eigenvector | A direction |'

  it('draws a table from GFM syntax', () => {
    const { container } = render(<AiReply>{table}</AiReply>)

    expect(container.querySelectorAll('tr')).toHaveLength(3)
    expect(screen.getByRole('columnheader', { name: 'Term' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'A scalar' })).toBeInTheDocument()
  })

  it('does not throw on a table that is still arriving', () => {
    expect(() => render(<AiReply>{'| Term | Meaning |\n| --- |'}</AiReply>)).not.toThrow()
  })
})

describe('AiReply math', () => {
  it('renders dollar-delimited math', () => {
    const { container } = render(<AiReply>{'The equation $Av = \\lambda v$ defines it.'}</AiReply>)

    expect(container.querySelector('.katex')).not.toBeNull()
    expect(container.textContent).toContain('defines it.')
  })

  it('renders display math', () => {
    const { container } = render(<AiReply>{'$$\n\\sum_{i=1}^{n} i\n$$'}</AiReply>)

    expect(container.querySelector('.katex-display')).not.toBeNull()
  })

  it.each([
    ['inline', 'It is \\(x^2\\) here.', '.katex'],
    ['display', 'It is \\[x^2\\] here.', '.katex-display'],
  ])('renders the backslash-bracket %s form models often write', (_name, text, selector) => {
    const { container } = render(<AiReply>{text}</AiReply>)

    expect(container.querySelector(selector)).not.toBeNull()
  })

  it('shows a half-written formula as text instead of throwing', () => {
    expect(() => render(<AiReply>{'Let $\\frac{a'}</AiReply>)).not.toThrow()
    expect(() => render(<AiReply>{'$$\\begin{matrix} a &'}</AiReply>)).not.toThrow()
  })

  it('does not let a formula make a link', () => {
    const { container } = render(<AiReply>{'See $\\href{https://evil.example}{notes}$.'}</AiReply>)

    expect(container.querySelector('a')).toBeNull()
  })
})

describe('AiReply links stay plain text alongside the new syntax', () => {
  it('does not link a bare URL, which GFM would otherwise turn into an anchor', () => {
    const { container } = render(<AiReply>{'Visit https://evil.example now'}</AiReply>)

    expect(container.querySelector('a')).toBeNull()
    expect(container.textContent).toContain('https://evil.example')
  })
})
