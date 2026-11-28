import { describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AiMessage, AiThinking, STILL_THINKING_AFTER_MS } from '@/components/ai/ai-message'
import { AiSuggestedPrompts } from '@/components/ai/ai-suggested-prompts'
import { AiComposer } from '@/components/ai/ai-composer'

describe('AiMessage', () => {
  it('renders the assistant’s text as markdown', () => {
    render(<AiMessage message={{ role: 'assistant', content: '**Eigenvalues** are scalars' }} />)

    expect(screen.getByText('Eigenvalues').tagName).toBe('STRONG')
  })

  it('echoes the student’s text verbatim instead of reading it as markdown', () => {
    const { container } = render(
      <AiMessage message={{ role: 'user', content: '# not a heading' }} />,
    )

    expect(screen.getByText('# not a heading')).toBeInTheDocument()
    expect(container.querySelector('h1')).toBeNull()
  })

  it('puts the host’s footer inside the bubble, after the answer', () => {
    render(
      <AiMessage
        message={{ role: 'assistant', content: 'An answer.' }}
        footer={<div role="note">Sources</div>}
      />,
    )

    expect(screen.getByRole('note').parentElement?.textContent).toBe('An answer.Sources')
  })

  it('offers to copy a finished assistant reply', () => {
    render(<AiMessage message={{ role: 'assistant', content: 'An answer.' }} />)

    expect(screen.getByRole('button', { name: 'Copy reply' })).toBeInTheDocument()
  })

  it.each([
    ['the host says it is still arriving', { role: 'assistant' as const, content: 'Half' }, false],
    ['it is the student’s message', { role: 'user' as const, content: 'Hi' }, true],
    ['it is a refusal', { role: 'assistant' as const, content: 'No.', offTopic: true }, true],
    ['it is empty', { role: 'assistant' as const, content: '' }, true],
  ])('does not offer to copy when %s', (_name, message, showCopy) => {
    render(<AiMessage message={message} showCopy={showCopy} />)

    expect(screen.queryByRole('button', { name: 'Copy reply' })).toBeNull()
  })
})

describe('AiMessage retry and streaming', () => {
  it('offers a retry that calls back, when the host provides one', async () => {
    const onRegenerate = vi.fn()
    render(
      <AiMessage
        message={{ role: 'assistant', content: 'An answer.' }}
        onRegenerate={onRegenerate}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Regenerate reply' }))

    expect(onRegenerate).toHaveBeenCalledTimes(1)
  })

  it('offers no retry unless the host provides one', () => {
    render(<AiMessage message={{ role: 'assistant', content: 'An answer.' }} />)

    expect(screen.queryByRole('button', { name: 'Regenerate reply' })).toBeNull()
  })

  it('still offers a retry on a refusal, which has nothing to copy', () => {
    render(
      <AiMessage
        message={{ role: 'assistant', content: 'No.', offTopic: true }}
        onRegenerate={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Regenerate reply' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Copy reply' })).toBeNull()
  })

  it('keeps the caret until the whole reply is on screen, then drops it', async () => {
    const { container, rerender } = render(
      <AiMessage message={{ role: 'assistant', content: 'Half an ans' }} streaming />,
    )
    expect(container.innerHTML).toContain('after:content-')

    rerender(<AiMessage message={{ role: 'assistant', content: 'Half an answer.' }} />)

    await waitFor(() => expect(container.textContent).toContain('Half an answer.'))
    await waitFor(() => expect(container.innerHTML).not.toContain('after:content-'))
  })

  it('reveals a streaming reply gradually and holds copy and retry until it is all shown', async () => {
    const long = 'An eigenvalue is a scalar that stretches its eigenvector. '.repeat(6).trim()
    const { container, rerender } = render(
      <AiMessage message={{ role: 'assistant', content: long }} streaming showCopy={false} />,
    )
    expect(container.textContent?.length ?? 0).toBeLessThan(long.length)

    rerender(<AiMessage message={{ role: 'assistant', content: long }} onRegenerate={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Copy reply' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Regenerate reply' })).toBeNull()

    // About 50 animation frames in jsdom, which slows down when the suite runs in parallel.
    expect(
      await screen.findByRole('button', { name: 'Copy reply' }, { timeout: 5000 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Regenerate reply' })).toBeInTheDocument()
    expect(container.textContent).toContain(long)
  })

  it('never animates the student’s own message', () => {
    render(<AiMessage message={{ role: 'user', content: 'My whole question?' }} streaming />)

    expect(screen.getByText('My whole question?')).toBeInTheDocument()
  })
})

describe('AiThinking', () => {
  it('announces that the assistant is working', () => {
    render(<AiThinking />)

    expect(screen.getByRole('status')).toHaveTextContent('Thinking…')
  })

  it('says it is still thinking once the wait runs long', () => {
    vi.useFakeTimers()
    try {
      render(<AiThinking />)
      expect(screen.getByRole('status')).toHaveTextContent('Thinking…')

      act(() => {
        vi.advanceTimersByTime(STILL_THINKING_AFTER_MS)
      })

      expect(screen.getByRole('status')).toHaveTextContent('Still thinking…')
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps the dots out of what a screen reader hears, and still for reduced motion', () => {
    const { container } = render(<AiThinking />)

    const dots = container.querySelectorAll('[aria-hidden="true"] > span')
    expect(dots).toHaveLength(3)
    dots.forEach((dot) => expect(dot.className).toContain('motion-reduce:animate-none'))
  })
})

describe('AiSuggestedPrompts', () => {
  it('hands the tapped prompt to onSelect', async () => {
    const onSelect = vi.fn()
    render(<AiSuggestedPrompts prompts={['One?', 'Two?']} onSelect={onSelect} />)

    await userEvent.click(screen.getByRole('button', { name: 'Two?' }))

    expect(onSelect).toHaveBeenCalledWith('Two?')
  })

  it('disables every prompt while an answer is on its way', () => {
    render(<AiSuggestedPrompts prompts={['One?']} onSelect={vi.fn()} disabled />)

    expect(screen.getByRole('button', { name: 'One?' })).toBeDisabled()
  })

  it('renders nothing when there are no prompts', () => {
    const { container } = render(<AiSuggestedPrompts prompts={[]} onSelect={vi.fn()} />)

    expect(container).toBeEmptyDOMElement()
  })
})

describe('AiComposer', () => {
  it('sends the trimmed text on Enter and clears the box', async () => {
    const onSend = vi.fn()
    const user = userEvent.setup()
    render(<AiComposer onSend={onSend} placeholder="Ask…" />)

    await user.type(screen.getByPlaceholderText('Ask…'), '  What is a norm?  {Enter}')

    expect(onSend).toHaveBeenCalledWith('What is a norm?')
    expect(screen.getByPlaceholderText('Ask…')).toHaveValue('')
  })

  it('starts a new line on Shift+Enter instead of sending', async () => {
    const onSend = vi.fn()
    const user = userEvent.setup()
    render(<AiComposer onSend={onSend} placeholder="Ask…" />)

    await user.type(screen.getByPlaceholderText('Ask…'), 'line one{Shift>}{Enter}{/Shift}two')

    expect(onSend).not.toHaveBeenCalled()
    expect(screen.getByPlaceholderText('Ask…')).toHaveValue('line one\ntwo')
  })

  it('sends with the button, which stays disabled until there is text', async () => {
    const onSend = vi.fn()
    const user = userEvent.setup()
    render(<AiComposer onSend={onSend} placeholder="Ask…" />)
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()

    await user.type(screen.getByPlaceholderText('Ask…'), 'Hi')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(onSend).toHaveBeenCalledWith('Hi')
  })

  it('blocks sending while an answer is on its way', async () => {
    const onSend = vi.fn()
    render(<AiComposer onSend={onSend} placeholder="Ask…" disabled />)

    expect(screen.getByPlaceholderText('Ask…')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
  })
})
