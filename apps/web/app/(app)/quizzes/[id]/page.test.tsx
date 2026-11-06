import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mocks = vi.hoisted(() => ({
  isGuest: false,
  signInWithUniauth: vi.fn(() => Promise.resolve()),
}))
vi.mock('next/navigation', () => ({ useParams: () => ({ id: 'q1' }) }))
vi.mock('@/contexts/auth-context', () => ({ useAuth: () => ({ isGuest: mocks.isGuest }) }))
vi.mock('@/src/lib/api/generated/quizzes/quizzes', () => ({
  useQuizzesControllerGetQuiz: () => ({
    data: { id: 'q1', title: 'Week 3 recap', questionsCount: 5, questions: [] },
    isLoading: false,
    error: null,
  }),
}))
vi.mock('@/components/quiz/QuizGame', () => ({ QuizGame: () => <p>Quiz game</p> }))
vi.mock('@/src/lib/auth/uniauth', () => ({ signInWithUniauth: mocks.signInWithUniauth }))

const { default: QuizPage } = await import('./page')

describe('quiz page', () => {
  beforeEach(() => {
    mocks.isGuest = false
    mocks.signInWithUniauth.mockClear()
  })

  it('starts the game for a member', () => {
    render(<QuizPage />)
    expect(screen.getByText('Quiz game')).toBeInTheDocument()
  })

  it('shows a guest the quiz and a sign-in prompt instead of the game', async () => {
    mocks.isGuest = true
    render(<QuizPage />)
    expect(screen.queryByText('Quiz game')).not.toBeInTheDocument()
    expect(screen.getByText('Week 3 recap')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Sign in to take this quiz' }))
    expect(mocks.signInWithUniauth).toHaveBeenCalledWith({ returnTo: window.location.href })
  })
})
