import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { TodayTop } from './today-top'

const useExams = vi.hoisted(() => vi.fn())

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    user: { name: 'Mya Aye', department: { id: 'd-1' } },
    isAuthenticated: true,
    isLoading: false,
  }),
}))
vi.mock('@/src/lib/api/generated/exams/exams', () => ({
  useExamsControllerFindAll: (...args: unknown[]) => {
    useExams(...args)
    return { data: [], isLoading: false }
  },
}))
vi.mock('./exam-hero', () => ({ ExamHero: () => null }))
vi.mock('./today-greeting', () => ({ TodayGreeting: () => null }))

describe('TodayTop', () => {
  it('asks only for exams of my courses', () => {
    render(<TodayTop />)
    expect(useExams.mock.calls[0][0]).toMatchObject({ mine: true })
  })
})
