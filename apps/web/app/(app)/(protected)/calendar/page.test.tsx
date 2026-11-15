import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CalendarPage from './page'

const exam = {
  id: 'e-1',
  title: 'Midterm',
  examRoom: 'Hall A',
  notes: null,
  startsAt: new Date().toISOString(),
  endsAt: null,
  createdBy: 'u-1',
  course: { id: 'c-1', code: 'CSC213', name: 'Data Structures', department: { id: 'd-1' } },
}

vi.mock('@/contexts/auth-context', () => ({ useAuth: () => ({ user: { role: 'ADMIN' } }) }))
vi.mock('@/hooks/use-my-departments', () => ({ useMyDepartments: () => ({ departments: [] }) }))
vi.mock('@/src/lib/api/generated/exams/exams', () => ({
  useExamsControllerFindAll: () => ({ data: [exam] }),
  useExamsControllerCreate: () => ({ mutate: vi.fn(), isPending: false }),
  useExamsControllerUpdate: () => ({ mutate: vi.fn(), isPending: false }),
  useExamsControllerRemove: () => ({ mutate: vi.fn(), isPending: false }),
  getExamsControllerFindAllQueryKey: () => ['exams'],
}))

// Simulates a student whose browser still holds the old Desk feed-style value.
beforeEach(() =>
  localStorage.setItem('unishare-feed-style', JSON.stringify({ state: { feedStyle: 'desk' } })),
)
afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('CalendarPage', () => {
  it('shows one calendar design', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <CalendarPage />
      </QueryClientProvider>,
    )
    expect(screen.getByText('Midterm')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit exam' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete exam' })).toBeInTheDocument()
  })
})
