import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PostAiChat } from '@/components/post-detail/post-ai-chat'
import type { PostDetailEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

const mocks = vi.hoisted(() => ({ sendMessage: vi.fn() }))

vi.mock('@/hooks/use-ai-index-status', () => ({
  useAiIndexStatus: () => ({
    status: { state: 'ready', indexedChunks: 40, supportedFiles: 1, readyFiles: 1 },
    isLoading: false,
  }),
}))

vi.mock('@/hooks/use-post-ai-chat', () => ({
  usePostAiChat: () => ({
    messages: [],
    sendMessage: mocks.sendMessage,
    regenerate: vi.fn(),
    isPending: false,
    reset: vi.fn(),
  }),
}))

vi.mock('@/hooks/use-practice-quiz', () => ({
  usePracticeQuiz: () => ({ quiz: null, round: 0, isLoading: false, error: null, start: vi.fn() }),
}))

vi.mock('@/hooks/use-suggested-questions', () => ({ useSuggestedQuestions: () => [] }))

const post = {
  id: 'post-1',
  files: [{ id: 'f1', mimeType: 'application/pdf' }],
} as unknown as PostDetailEntity

const PLACEHOLDER = 'Ask about this document…'

describe('PostAiChat draft', () => {
  it('keeps a half-typed question when the panel is closed and opened again', async () => {
    const user = userEvent.setup()
    render(<PostAiChat post={post} />)
    const trigger = screen.getByRole('button', { name: /ask ai/i })

    await user.click(trigger)
    await user.type(screen.getByPlaceholderText(PLACEHOLDER), 'What is a no')
    await user.click(trigger)
    await waitFor(() => expect(screen.queryByPlaceholderText(PLACEHOLDER)).toBeNull())
    await user.click(trigger)

    expect(await screen.findByPlaceholderText(PLACEHOLDER)).toHaveValue('What is a no')
  })

  it('clears the draft once it is sent', async () => {
    const user = userEvent.setup()
    render(<PostAiChat post={post} />)

    await user.click(screen.getByRole('button', { name: /ask ai/i }))
    await user.type(screen.getByPlaceholderText(PLACEHOLDER), 'What is a norm?{Enter}')

    expect(mocks.sendMessage).toHaveBeenCalledWith('What is a norm?')
    expect(screen.getByPlaceholderText(PLACEHOLDER)).toHaveValue('')
  })
})
