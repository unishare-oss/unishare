import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { CourseCheckCard } from './course-check-card'

const mocks = vi.hoisted(() => ({
  user: null as null | { department?: { id: string } | null; yearLevel?: number | null },
  data: null as unknown,
  mutate: vi.fn(),
  invalidate: vi.fn(),
  toast: vi.fn(),
}))

vi.mock('@/contexts/auth-context', () => ({ useAuth: () => ({ user: mocks.user }) }))
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidate }),
}))
vi.mock('sonner', () => ({ toast: { success: mocks.toast, error: vi.fn() } }))
vi.mock('@/src/lib/api/generated/users/users', () => ({
  getMyCoursesControllerGetMineQueryKey: () => ['my-courses'],
  useMyCoursesControllerGetMine: () => ({ data: mocks.data }),
  useMyCoursesControllerSaveMine: (options: { mutation: { onSuccess: () => void } }) => ({
    isPending: false,
    mutate: (vars: unknown) => {
      mocks.mutate(vars)
      options.mutation.onSuccess()
    },
  }),
}))
vi.mock('@/components/my-courses/my-courses-dialog', () => ({
  MyCoursesDialog: () => <div role="dialog">Course dialog</div>,
}))

const courses = [
  { id: 'c-1', code: 'CSC213', name: 'Data Structures', yearLevel: 2 },
  { id: 'c-2', code: 'MTH101', name: 'Calculus I', yearLevel: 2 },
]

function setData(overrides: Record<string, unknown> = {}) {
  mocks.data = {
    academicYear: 2026,
    automatic: courses,
    removed: [],
    added: [],
    final: courses,
    confirmed: false,
    ...overrides,
  }
}

describe('CourseCheckCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.user = { department: { id: 'd-1' }, yearLevel: 2 }
    setData()
  })

  it('shows the yearly check while the year is not confirmed', () => {
    render(<CourseCheckCard />)
    expect(screen.getByRole('heading', { name: 'New year, new courses' })).toBeInTheDocument()
    expect(screen.getByText(/Check your 2026\/27 courses/)).toBeInTheDocument()
  })

  it('hides once the year is confirmed', () => {
    setData({ confirmed: true })
    const { container } = render(<CourseCheckCard />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows again for the next academic year (unconfirmed)', () => {
    setData({ academicYear: 2027, confirmed: false })
    render(<CourseCheckCard />)
    expect(screen.getByText(/Check your 2027\/28 courses/)).toBeInTheDocument()
  })

  it('hides without a department or year', () => {
    mocks.user = { department: null, yearLevel: null }
    const { container } = render(<CourseCheckCard />)
    expect(container).toBeEmptyDOMElement()
  })

  it('Looks right saves the shown course ids and thanks the student', () => {
    render(<CourseCheckCard />)
    fireEvent.click(screen.getByRole('button', { name: 'Looks right' }))
    expect(mocks.mutate).toHaveBeenCalledWith({ data: { courseIds: ['c-1', 'c-2'] } })
    expect(mocks.invalidate).toHaveBeenCalledWith({ queryKey: ['my-courses'] })
    expect(mocks.toast).toHaveBeenCalledWith('Thanks. Reminders follow these courses this year.')
  })

  it('Check courses opens the dialog', () => {
    render(<CourseCheckCard />)
    fireEvent.click(screen.getByRole('button', { name: 'Check courses' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('empty list: add wording, no Looks right, Add courses opens the dialog', () => {
    setData({ automatic: [], final: [] })
    render(<CourseCheckCard />)
    expect(
      screen.getByRole('heading', { name: 'No courses found for your year' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Looks right' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Add courses' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
