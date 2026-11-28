import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { AiReply } from '@/components/ai/ai-reply'

describe('AiReply leaves code alone when it converts math delimiters', () => {
  it('keeps a backslash-paren example inside a fenced block', () => {
    const { container } = render(<AiReply>{'```python\nx = r"\\(foo\\)"\n```'}</AiReply>)

    expect(container.querySelector('pre')?.textContent).toBe('x = r"\\(foo\\)"')
    expect(container.querySelector('.katex')).toBeNull()
  })

  it('keeps a backslash-bracket example inside a fenced block', () => {
    const { container } = render(<AiReply>{'```\n\\[ literal \\]\n```'}</AiReply>)

    expect(container.querySelector('pre')?.textContent).toBe('\\[ literal \\]')
  })

  it('keeps delimiters inside inline code', () => {
    const { container } = render(<AiReply>{'Write `\\(x\\)` for inline math.'}</AiReply>)

    expect(container.querySelector('code')?.textContent).toBe('\\(x\\)')
    expect(container.querySelector('.katex')).toBeNull()
  })

  it('keeps delimiters inside a fence that is still being written', () => {
    const { container } = render(<AiReply>{'```python\nx = r"\\(foo\\)"'}</AiReply>)

    expect(container.textContent).toContain('\\(foo\\)')
    expect(container.querySelector('.katex')).toBeNull()
  })

  it('still converts a formula in the prose around a code block', () => {
    const { container } = render(
      <AiReply>{'It is \\(x^2\\) here.\n\n```\nplain\n```\n\nAnd \\(y\\) there.'}</AiReply>,
    )

    expect(container.querySelectorAll('.katex')).toHaveLength(2)
    expect(container.querySelector('pre')?.textContent).toBe('plain')
  })
})

describe('AiReply math for assistive technology', () => {
  it('keeps the MathML copy that screen readers read', () => {
    const { container } = render(<AiReply>{'The answer is $x^2$.'}</AiReply>)

    expect(container.querySelector('math')).not.toBeNull()
    expect(container.querySelector('msup')).not.toBeNull()
    // The drawn copy is hidden from them, which is why the MathML copy has to survive.
    expect(container.querySelector('.katex-html')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('keeps the TeX source on the formula for tools that read it', () => {
    const { container } = render(<AiReply>{'See $\\frac{a}{b}$.'}</AiReply>)

    expect(container.querySelector('annotation')?.textContent).toBe('\\frac{a}{b}')
  })

  it('still makes no link from a formula', () => {
    const { container } = render(<AiReply>{'See $\\href{https://evil.example}{notes}$.'}</AiReply>)

    expect(container.querySelector('a')).toBeNull()
  })
})
