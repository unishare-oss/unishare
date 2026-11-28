import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PostAiChat } from '@/components/post-detail/post-ai-chat'
import type { ChatMessage } from '@/hooks/use-post-ai-chat'
import type { PostDetailEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

const mocks = vi.hoisted(() => ({
  messages: [] as ChatMessage[],
  isPending: false,
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
    sendMessage: vi.fn(),
    isPending: mocks.isPending,
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

async function renderOpened() {
  const user = userEvent.setup()
  render(<PostAiChat post={post} />)
  await user.click(screen.getByRole('button', { name: /ask ai/i }))
}

describe('PostAiChat copy button', () => {
  beforeEach(() => {
    mocks.messages = []
    mocks.isPending = false
  })

  it('offers to copy a finished reply', async () => {
    mocks.messages = [
      { role: 'user', content: 'What is an eigenvalue?' },
      { role: 'assistant', content: 'A scalar.' },
    ]
    await renderOpened()

    expect(screen.getAllByRole('button', { name: 'Copy reply' })).toHaveLength(1)
  })

  it('does not offer to copy the student’s own message', async () => {
    mocks.messages = [{ role: 'user', content: 'Hi' }]
    await renderOpened()

    expect(screen.queryByRole('button', { name: 'Copy reply' })).toBeNull()
  })

  it('waits until the reply has finished arriving', async () => {
    mocks.isPending = true
    mocks.messages = [
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Half an ans' },
    ]
    await renderOpened()

    expect(screen.queryByRole('button', { name: 'Copy reply' })).toBeNull()
  })

  it('does not offer to copy a refusal', async () => {
    mocks.messages = [
      { role: 'user', content: 'What is the weather?' },
      {
        role: 'assistant',
        content: 'I can only answer questions about this document.',
        offTopic: true,
      },
    ]
    await renderOpened()

    expect(screen.queryByRole('button', { name: 'Copy reply' })).toBeNull()
  })
})
