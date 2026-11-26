import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PostAiChat } from '@/components/post-detail/post-ai-chat'
import type { PostDetailEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

const mocks = vi.hoisted(() => ({
  quiz: null as unknown,
  quizError: null as string | null,
  quizLoading: false,
  startQuiz: vi.fn(),
}))

vi.mock('@/hooks/use-ai-index-status', () => ({
  useAiIndexStatus: () => ({
    status: { state: 'ready', indexedChunks: 40, supportedFiles: 1, readyFiles: 1 },
    isLoading: false,
  }),
}))

vi.mock('@/hooks/use-post-ai-chat', () => ({
  usePostAiChat: () => ({ messages: [], sendMessage: vi.fn(), isPending: false, reset: vi.fn() }),
}))

vi.mock('@/hooks/use-practice-quiz', () => ({
  usePracticeQuiz: () => ({
    quiz: mocks.quiz,
    round: 1,
    isLoading: mocks.quizLoading,
    error: mocks.quizError,
    start: mocks.startQuiz,
  }),
}))

vi.mock('@/components/post-detail/practice-quiz', () => ({
  PracticeQuiz: () => <div>practice quiz surface</div>,
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

describe('PostAiChat practice quiz', () => {
  beforeEach(() => {
    mocks.quiz = null
    mocks.quizError = null
    mocks.quizLoading = false
    mocks.startQuiz.mockReset()
  })

  it('offers to quiz the student and asks for questions when pressed', async () => {
    const user = await renderOpened()

    await user.click(screen.getByRole('button', { name: /quiz me on this post/i }))

    expect(mocks.startQuiz).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('practice quiz surface')).not.toBeInTheDocument()
  })

  it('shows the questions and offers a fresh set once there are some', async () => {
    mocks.quiz = { messages: [], answers: [] }
    await renderOpened()

    expect(screen.getByText('practice quiz surface')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /new practice questions/i })).toBeInTheDocument()
  })

  it('disables the button while questions are being written', async () => {
    mocks.quizLoading = true
    await renderOpened()

    expect(screen.getByRole('button', { name: /writing questions/i })).toBeDisabled()
  })

  it('says why no questions came back', async () => {
    mocks.quizError = 'Practice questions are unavailable right now. Please try again later.'
    await renderOpened()

    expect(screen.getByRole('status')).toHaveTextContent(/practice questions are unavailable/i)
  })
})
