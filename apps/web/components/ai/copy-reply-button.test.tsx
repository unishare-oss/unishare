import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CopyReplyButton } from '@/components/ai/copy-reply-button'

function stubClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
}

// `userEvent.setup()` installs its own clipboard stub, so each test stubs the clipboard AFTER it.
describe('CopyReplyButton', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('copies the reply text and says so', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubClipboard(writeText)
    render(<CopyReplyButton text="**Eigenvalues** are scalars" />)

    await user.click(screen.getByRole('button', { name: 'Copy reply' }))

    expect(writeText).toHaveBeenCalledWith('**Eigenvalues** are scalars')
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })

  it('goes back to "Copy" after a moment', async () => {
    vi.useFakeTimers()
    stubClipboard(vi.fn().mockResolvedValue(undefined))
    render(<CopyReplyButton text="x" />)

    await act(async () => {
      screen.getByRole('button', { name: 'Copy reply' }).click()
    })
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.getByRole('button', { name: 'Copy reply' })).toBeInTheDocument()
  })

  it('does not claim success when the clipboard refuses', async () => {
    const user = userEvent.setup()
    stubClipboard(vi.fn().mockRejectedValue(new Error('denied')))
    render(<CopyReplyButton text="x" />)

    await user.click(screen.getByRole('button', { name: 'Copy reply' }))

    expect(screen.getByRole('button', { name: 'Copy reply' })).toBeInTheDocument()
  })
})
