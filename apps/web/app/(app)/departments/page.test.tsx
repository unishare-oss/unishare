import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  auth: { isAuthenticated: false, isLoading: false },
  universities: vi.fn(),
}))

vi.mock('@/contexts/auth-context', () => ({ useAuth: () => mocks.auth }))
vi.mock('@/hooks/use-my-departments', () => ({
  NO_UNIVERSITY_MESSAGE: 'no university',
  useMyDepartments: () => ({ departments: [], isLoading: false, noUniversity: false }),
}))
vi.mock('@/src/lib/api/generated/universities/universities', () => ({
  useUniversitiesControllerFindAll: (options: { query: { enabled: boolean } }) => {
    mocks.universities(options.query.enabled)
    return { data: [], isLoading: false }
  },
}))
vi.mock('@/components/shared/page-header', () => ({ PageHeader: () => null }))
vi.mock('@/components/departments/dept-list', () => ({
  DeptList: () => null,
  DeptListSkeleton: () => null,
}))

const { default: DepartmentsPage } = await import('./page')

afterEach(cleanup)
beforeEach(() => mocks.universities.mockClear())

describe('DepartmentsPage', () => {
  it('does not fetch universities while the session is loading', () => {
    mocks.auth = { isAuthenticated: false, isLoading: true }
    render(<DepartmentsPage />)
    expect(mocks.universities).toHaveBeenLastCalledWith(false)
  })

  it('fetches universities for a signed-out visitor', () => {
    mocks.auth = { isAuthenticated: false, isLoading: false }
    render(<DepartmentsPage />)
    expect(mocks.universities).toHaveBeenLastCalledWith(true)
  })

  it('does not fetch universities for a signed-in user', () => {
    mocks.auth = { isAuthenticated: true, isLoading: false }
    render(<DepartmentsPage />)
    expect(mocks.universities).toHaveBeenLastCalledWith(false)
  })
})
