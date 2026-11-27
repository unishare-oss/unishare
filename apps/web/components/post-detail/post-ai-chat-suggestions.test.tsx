import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PostAiChat } from '@/components/post-detail/post-ai-chat'
import type { ChatMessage } from '@/hooks/use-post-ai-chat'
import type { PostDetailEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

const mocks = vi.hoisted(() => ({
  messages: [] as ChatMessage[],
  isPending: false,
  sendMessage: vi.fn(),
}))

vi.mock('@/hooks/use-ai-index-status', () => ({
  useAiIndexStatus: () => ({
    status: { state: 'ready', indexedChunks: 40, supportedFiles: 1, readyFiles: 1 },
    isLoading: false,
  }),
}))

vi.mock('@/hooks/use-post-ai-chat', () => ({
  usePostAiChat: () => ({
    messages: mocks.messages,
    sendMessage: mocks.sendMessage,
    isPending: mocks.isPending,
    reset: vi.fn(),
  }),
}))

vi.mock('@/hooks/use-practice-quiz', () => ({
  usePracticeQuiz: () => ({
    quiz: null,
    round: 0,
    isLoading: false,
    error: null,
    start: vi.fn(),
  }),
}))

const post = {
  id: 'post-1',
  files: [{ id: 'f1', mimeType: 'application/pdf' }],
} as unknown as PostDetailEntity

async function renderOpened() {
  const user = userEvent.setup()
  render(<PostAiChat post={post} />)
  await user.click(screen.getByRole('button', { name: /ask ai/i }))
  return user
}

describe('PostAiChat suggested questions', () => {
  beforeEach(() => {
    mocks.messages = []
    mocks.isPending = false
    mocks.sendMessage.mockReset()
  })

  it('offers suggested questions before the conversation starts', async () => {
    await renderOpened()

    expect(screen.getByRole('button', { name: 'Summarize this document' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'What are the key points?' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Explain the main concepts simply' }),
    ).toBeInTheDocument()
  })

  it('sends the suggestion as the student’s message when tapped', async () => {
    const user = await renderOpened()

    await user.click(screen.getByRole('button', { name: 'What are the key points?' }))

    expect(mocks.sendMessage).toHaveBeenCalledWith('What are the key points?')
  })

  it('hides the suggestions once there is a conversation', async () => {
    mocks.messages = [{ role: 'user', content: 'Hi' }]
    await renderOpened()

    expect(screen.queryByRole('button', { name: 'Summarize this document' })).toBeNull()
  })

  it('disables the suggestions while an answer is being written', async () => {
    mocks.isPending = true
    await renderOpened()

    expect(screen.getByRole('button', { name: 'Summarize this document' })).toBeDisabled()
  })
})
