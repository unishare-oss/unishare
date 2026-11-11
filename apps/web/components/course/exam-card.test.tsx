import { render, screen } from '@testing-library/react'
import { addDays, addHours } from 'date-fns'
import { describe, expect, it, vi } from 'vitest'
import { ExamCard } from './exam-card'

const exams = vi.hoisted(() => ({ data: [] as unknown[], isLoading: false }))

vi.mock('@/src/lib/api/generated/exams/exams', () => ({
  useExamsControllerFindAll: () => ({ data: exams.data, isLoading: exams.isLoading }),
}))

const exam = (startsAt: Date, overrides: Record<string, unknown> = {}) => ({
  id: 'e1',
  title: 'Final exam',
  startsAt: startsAt.toISOString(),
  endsAt: addHours(startsAt, 2).toISOString(),
  examRoom: 'Hall B',
  course: { id: 'c1', code: 'CSC213', name: 'Data Structures' },
  ...overrides,
})

describe('ExamCard', () => {
  it('shows the next exam with date, time, room and days left', () => {
    exams.data = [exam(addDays(new Date(), 6))]
    render(<ExamCard courseId="c1" departmentId="d1" />)

    expect(screen.getByText('Final exam')).toBeInTheDocument()
    expect(screen.getByText('Hall B')).toBeInTheDocument()
    expect(screen.getByText('6 days left')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add to calendar' })).toHaveAttribute(
      'href',
      expect.stringContaining('calendar.google.com'),
    )
  })

  it('shows the empty state when no exam is set', () => {
    exams.data = []
    render(<ExamCard courseId="c1" departmentId="d1" />)

    expect(screen.getByText('No exam dates yet')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Add to calendar' })).toBeNull()
  })

  it('uses the soonest upcoming exam', () => {
    exams.data = [exam(addDays(new Date(), 20), { title: 'Later' }), exam(addDays(new Date(), 2))]
    render(<ExamCard courseId="c1" departmentId="d1" />)

    expect(screen.getByText('Final exam')).toBeInTheDocument()
    expect(screen.queryByText('Later')).toBeNull()
  })
})
