import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MyCoursesCard } from '@/components/my-courses-card'

const mocks = vi.hoisted(() => ({
  user: null as null | {
    department?: { id: string; name: string } | null
    yearLevel?: number | null
  },
  courses: [] as { id: string; code: string; name: string; yearLevel: number }[],
}))

vi.mock('@/contexts/auth-context', () => ({ useAuth: () => ({ user: mocks.user }) }))
vi.mock('@/src/lib/api/generated/courses/courses', () => ({
  useCoursesControllerFindAll: () => ({ data: { items: mocks.courses } }),
}))

describe('MyCoursesCard', () => {
  beforeEach(() => {
    mocks.user = { department: { id: 'd-1', name: 'Computer Science' }, yearLevel: 2 }
    mocks.courses = [
      { id: 'c-1', code: 'CSC213', name: 'Data Structures', yearLevel: 2 },
      { id: 'c-2', code: 'CSC401', name: 'Compilers', yearLevel: 4 },
    ]
  })

  it('lists the courses for the student year with the department and year as subtitle', () => {
    render(<MyCoursesCard />)
    expect(screen.getByRole('heading', { name: 'My courses' })).toBeInTheDocument()
    expect(screen.getByText('Computer Science · Year 2')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /CSC213/ })).toHaveTextContent('Data Structures')
    expect(screen.queryByText('CSC401')).not.toBeInTheDocument()
  })

  it('links to all department courses', () => {
    render(<MyCoursesCard />)
    expect(screen.getByRole('link', { name: 'All department courses' })).toHaveAttribute(
      'href',
      '/departments/d-1',
    )
  })

  it('My courses items link to course pages', () => {
    render(<MyCoursesCard />)
    expect(screen.getByRole('link', { name: /CSC213/ })).toHaveAttribute('href', '/courses/c-1')
  })

  it.each([
    ['a guest or signed-out visitor', null, true],
    ['a member without a department', { department: null, yearLevel: 2 }, true],
    ['a member without a year', { department: { id: 'd-1', name: 'CS' }, yearLevel: null }, true],
    ['a student with no courses this year', undefined, false],
  ])('renders nothing for %s', (_label, user, hasCourses) => {
    if (user !== undefined) mocks.user = user
    if (!hasCourses) mocks.courses = []
    const { container } = render(<MyCoursesCard />)
    expect(container).toBeEmptyDOMElement()
  })
})
