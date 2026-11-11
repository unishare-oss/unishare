import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DepartmentPage from './page'

const nav = vi.hoisted(() => ({ push: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: nav.push }),
}))

vi.mock('@/src/lib/api/generated/departments/departments', () => ({
  useDepartmentsControllerFindOne: () => ({ data: { id: 'd1', name: 'Computer Science' } }),
}))

vi.mock('@/src/lib/api/generated/courses/courses', () => ({
  useCoursesControllerFindAll: () => ({
    isLoading: false,
    data: {
      items: [
        { id: 'c1', code: 'CSC213', name: 'Data Structures', yearLevel: 2 },
        { id: 'c2', code: 'CSC101', name: 'Intro', yearLevel: 1 },
      ],
    },
  }),
}))

vi.mock('@/components/shared/page-header', () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}))

describe('DepartmentPage course list', () => {
  beforeEach(() => nav.push.mockClear())

  it('opens the course page for a clicked course', async () => {
    await act(async () => {
      render(<DepartmentPage params={Promise.resolve({ id: 'd1' })} />)
    })

    fireEvent.click(screen.getByRole('button', { name: /CSC213/ }))
    expect(nav.push).toHaveBeenCalledWith('/courses/c1')
  })
})
