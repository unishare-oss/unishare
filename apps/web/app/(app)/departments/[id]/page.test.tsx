import { Suspense } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import DepartmentPage from '@/app/(app)/departments/[id]/page'
import { useFeedStore } from '@/lib/store'

vi.mock('@/components/shared/page-header', () => ({ PageHeader: () => null }))
vi.mock('@/src/lib/api/generated/departments/departments', () => ({
  useDepartmentsControllerFindOne: () => ({ data: { id: 'd-1', name: 'Computer Science' } }),
}))
vi.mock('@/src/lib/api/generated/courses/courses', () => ({
  useCoursesControllerFindAll: () => ({
    isLoading: false,
    data: {
      items: [
        { id: 'c-1', code: 'CSC213', name: 'Data Structures', yearLevel: 2 },
        { id: 'c-2', code: 'CSC401', name: 'Compilers', yearLevel: 4 },
      ],
    },
  }),
}))

describe('DepartmentPage', () => {
  it('course rows link to course pages', async () => {
    const setPendingFilter = vi.spyOn(useFeedStore.getState(), 'setPendingFilter')
    await act(async () => {
      render(
        <Suspense>
          <DepartmentPage params={Promise.resolve({ id: 'd-1' })} />
        </Suspense>,
      )
    })
    expect(screen.getByRole('link', { name: /CSC213/ })).toHaveAttribute('href', '/courses/c-1')
    expect(screen.getByRole('link', { name: /CSC401/ })).toHaveAttribute('href', '/courses/c-2')
    expect(setPendingFilter).not.toHaveBeenCalled()
  })
})
