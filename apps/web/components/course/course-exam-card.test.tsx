import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CourseExamCard } from '@/components/course/course-exam-card'

const mocks = vi.hoisted(() => ({
  auth: { isAuthenticated: true, isGuest: false },
  exams: [] as unknown[],
  useExams: vi.fn(),
}))

vi.mock('@/contexts/auth-context', () => ({ useAuth: () => mocks.auth }))
vi.mock('@/src/lib/api/generated/exams/exams', () => ({
  useExamsControllerFindAll: (...args: unknown[]) => {
    mocks.useExams(...args)
    return { data: mocks.exams }
  },
}))

// Local noon keeps the calendar-day count stable whatever time the test runs.
const exam = (id: string, title: string, offsetDays: number) => {
  const startsAt = new Date()
  startsAt.setDate(startsAt.getDate() + offsetDays)
  startsAt.setHours(12, 0, 0, 0)
  return { id, title, examRoom: 'CB2301', startsAt: startsAt.toISOString(), endsAt: null }
}

describe('CourseExamCard', () => {
  beforeEach(() => {
    mocks.auth = { isAuthenticated: true, isGuest: false }
    mocks.exams = []
    mocks.useExams.mockClear()
  })

  it('shows the next exam for members', () => {
    mocks.exams = [exam('e2', 'Final', 6), exam('e1', 'Midterm', 3), exam('e0', 'Past', -2)]
    render(<CourseExamCard courseId="c-1" departmentId="d-9" />)
    expect(screen.getByText('Midterm')).toBeInTheDocument()
    expect(screen.queryByText('Final')).not.toBeInTheDocument()
    expect(screen.getByText('3 days left')).toBeInTheDocument()
    expect(mocks.useExams.mock.calls[0][0]).toMatchObject({ courseId: 'c-1', departmentId: 'd-9' })
  })

  it('shows a No upcoming exam card for members without one', () => {
    mocks.exams = [exam('e0', 'Past', -2)]
    render(<CourseExamCard courseId="c-1" departmentId="d-9" />)
    expect(screen.getByText('No upcoming exam')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open calendar' })).toHaveAttribute('href', '/calendar')
    expect(screen.queryByText(/days? left/)).not.toBeInTheDocument()
  })

  it('keeps the card in place while exams load', () => {
    mocks.exams = undefined as unknown as unknown[]
    render(<CourseExamCard courseId="c-1" departmentId="d-9" />)
    expect(screen.getByLabelText('Loading the next exam')).toBeInTheDocument()
    expect(screen.queryByText('No upcoming exam')).not.toBeInTheDocument()
  })

  it('renders nothing for guests and makes no request', () => {
    mocks.auth = { isAuthenticated: false, isGuest: true }
    mocks.exams = [exam('e1', 'Midterm', 3)]
    const { container } = render(<CourseExamCard courseId="c-1" departmentId="d-9" />)
    expect(container).toBeEmptyDOMElement()
    expect(mocks.useExams.mock.calls[0][1]).toMatchObject({ query: { enabled: false } })
  })
})
