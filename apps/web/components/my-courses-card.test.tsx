import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MyCoursesCard } from '@/components/my-courses-card'

const mocks = vi.hoisted(() => ({
  user: null as null | {
    department?: { id: string; name: string } | null
    yearLevel?: number | null
    enrollmentYear?: number | null
  },
  courses: [] as { id: string; code: string; name: string; yearLevel: number | null }[],
}))

vi.mock('@/contexts/auth-context', () => ({ useAuth: () => ({ user: mocks.user }) }))
vi.mock('@/src/lib/api/generated/users/users', () => ({
  useMyCoursesControllerGetMine: () => ({
    data: {
      automatic: mocks.courses,
      removed: [],
      added: [],
      final: mocks.courses,
      confirmed: false,
      academicYear: 2026,
    },
  }),
}))
vi.mock('@/components/my-courses/my-courses-dialog', () => ({
  MyCoursesDialog: () => <div role="dialog">Course dialog</div>,
}))

describe('MyCoursesCard', () => {
  beforeEach(() => {
    mocks.user = {
      department: { id: 'd-1', name: 'Computer Science' },
      yearLevel: 2,
      enrollmentYear: 2025,
    }
    mocks.courses = [
      { id: 'c-1', code: 'CSC213', name: 'Data Structures', yearLevel: 2 },
      { id: 'c-2', code: 'ELE101', name: 'Elective', yearLevel: null },
    ]
  })

  it('lists the courses for the student year with the department and year as subtitle', () => {
    render(<MyCoursesCard />)
    expect(screen.getByRole('heading', { name: 'My courses' })).toBeInTheDocument()
    expect(screen.getByText('2026/27 · Computer Science · Year 2')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /CSC213/ })).toHaveTextContent('Data Structures')
    expect(screen.getByRole('link', { name: /ELE101/ })).toHaveTextContent('Elective')
  })

  it('links to all department courses', () => {
    render(<MyCoursesCard />)
    expect(screen.getByRole('link', { name: 'All department courses' })).toHaveAttribute(
      'href',
      '/departments/d-1',
    )
  })

  it('opens Change courses beside the department link and updates after query refresh', () => {
    const { rerender } = render(<MyCoursesCard />)
    fireEvent.click(screen.getByRole('button', { name: 'Change courses' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    mocks.courses = [{ id: 'c-2', code: 'ELE101', name: 'Elective', yearLevel: null }]
    rerender(<MyCoursesCard />)
    expect(screen.queryByRole('link', { name: /CSC213/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ELE101/ })).toBeInTheDocument()
  })

  it('uses the server academic year even when the profile year level was clamped', () => {
    mocks.user = {
      department: { id: 'd-1', name: 'Computer Science' },
      enrollmentYear: 2028,
      yearLevel: 1,
    }
    render(<MyCoursesCard />)
    expect(screen.getByText('2026/27 · Computer Science · Year 1')).toBeInTheDocument()
  })

  it('My courses items link to course pages', () => {
    render(<MyCoursesCard />)
    expect(screen.getByRole('link', { name: /CSC213/ })).toHaveAttribute('href', '/courses/c-1')
  })

  it('shows the empty wording when the final list is empty', () => {
    mocks.courses = []
    render(<MyCoursesCard />)
    expect(screen.getByText('No courses found for your year — add yours')).toBeInTheDocument()
    expect(screen.getByText('2026/27 · Computer Science · Year 2')).toBeInTheDocument()
  })

  it.each([
    ['a guest or signed-out visitor', null],
    ['a member without a department', { department: null, yearLevel: 2 }],
    ['a member without a year', { department: { id: 'd-1', name: 'CS' }, yearLevel: null }],
  ])('renders nothing for %s', (_label, user) => {
    mocks.user = user
    const { container } = render(<MyCoursesCard />)
    expect(container).toBeEmptyDOMElement()
  })
})
