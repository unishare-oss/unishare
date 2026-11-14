import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ExamEntity } from '@/src/lib/api/generated/unishareAPI.schemas'
import { getExamHero } from './exam-hero-data'
import { ExamHero } from './exam-hero'

const mocks = vi.hoisted(() => ({ posts: [] as unknown[], usePosts: vi.fn() }))

vi.mock('@/components/noto/noto', () => ({ Noto: () => <div data-testid="noto" /> }))
vi.mock('@/src/lib/api/generated/posts/posts', () => ({
  usePostsControllerFindAll: (...args: unknown[]) => {
    mocks.usePosts(...args)
    return { data: { items: mocks.posts } }
  },
}))

const now = new Date(2026, 10, 10, 10, 0)

function exam(id: string, code: string, title: string, offsetDays: number, hour = 9): ExamEntity {
  const startsAt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays, hour)
  return {
    id,
    title,
    examRoom: id === 'e1' ? 'CB2301' : null,
    startsAt: startsAt.toISOString(),
    course: { id: `c-${id.slice(1)}`, code },
  } as ExamEntity
}

function renderHero(exams: ExamEntity[]) {
  const hero = getExamHero(exams, now)!
  render(<ExamHero hero={hero} firstName="Mya" now={now} />)
}

describe('ExamHero', () => {
  beforeEach(() => {
    mocks.posts = []
    mocks.usePosts.mockClear()
  })

  it('links Revise to the course page', () => {
    mocks.posts = [{ id: 'p-9', title: 'Hash tables' }]
    renderHero([
      exam('e1', 'CSC213', 'Final', 6),
      exam('e2', 'MTH101', 'Midterm', 8),
      exam('e3', 'PHY103', 'Final', 10),
      exam('e4', 'ENG102', 'Final', 13),
    ])
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/, Mya$/)
    expect(screen.getByText('CSC213 Final').closest('p')).toHaveTextContent(
      /CSC213 Final is in 6 days · .*, 09:00 · CB2301/,
    )
    expect(screen.getByRole('link', { name: /MTH101 Midterm/ })).toHaveAttribute(
      'href',
      '/calendar',
    )
    expect(screen.getByRole('link', { name: /PHY103 Final/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /ENG102/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '+1' })).toHaveAttribute('href', '/calendar')
    expect(screen.getByRole('link', { name: 'Revise CSC213' })).toHaveAttribute(
      'href',
      '/courses/c-1',
    )
    expect(screen.getByRole('link', { name: 'Hash tables' })).toHaveAttribute('href', '/posts/p-9')
    expect(mocks.usePosts.mock.calls[0][0]).toMatchObject({ courseId: 'c-1', limit: 1 })
  })

  it('hides Newest when the course has no posts', () => {
    renderHero([exam('e1', 'CSC213', 'Final', 6)])
    expect(screen.queryByText(/Newest/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Revise CSC213' })).toBeInTheDocument()
    expect(screen.queryByText(/leave time for both/)).not.toBeInTheDocument()
  })

  it('shows the back-to-back warning', () => {
    renderHero([exam('e1', 'CSC213', 'Final', 6), exam('e2', 'MTH101', 'Midterm', 7)])
    expect(
      screen.getByText('MTH101 Midterm is the day after CSC213 Final, so leave time for both.'),
    ).toBeVisible()
  })

  it('does not repeat the course code when the title starts with it', () => {
    renderHero([exam('e1', 'CSC213', 'CSC213 Final', 6), exam('e2', 'MTH101', 'Midterm', 6)])
    expect(screen.getByText('CSC213 Final')).toBeInTheDocument()
    expect(screen.queryByText(/CSC213 CSC213/)).not.toBeInTheDocument()
    expect(screen.getByText(/MTH101 Midterm is the same day as CSC213 Final/)).toBeVisible()
  })

  it('says the exam is today', () => {
    renderHero([exam('e1', 'CSC213', 'Final', 0, 23)])
    expect(screen.getByText('CSC213 Final').closest('p')).toHaveTextContent(/is today/)
  })
})
