import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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

const useExams = vi.hoisted(() => vi.fn())

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ user: { role: 'ADMIN', department: { id: 'd-1' } } }),
}))
vi.mock('@/components/ui/search-select', () => ({
  SearchSelect: ({
    options,
    onChange,
  }: {
    options: { value: string; label: string }[]
    onChange: (v: string) => void
  }) => (
    <div>
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)}>
          pick {o.label}
        </button>
      ))}
    </div>
  ),
}))
vi.mock('@/hooks/use-my-departments', () => ({
  useMyDepartments: () => ({ departments: [{ id: 'd-2', name: 'Law' }] }),
}))
vi.mock('@/src/lib/api/generated/exams/exams', () => ({
  useExamsControllerFindAll: (...args: unknown[]) => {
    useExams(...args)
    return { data: [exam] }
  },
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

const lastParams = () => useExams.mock.calls.at(-1)![0]

function renderPage() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CalendarPage />
    </QueryClientProvider>,
  )
}

describe('CalendarPage filters', () => {
  beforeEach(() => useExams.mockClear())

  it('opens on My exams', () => {
    renderPage()
    expect(lastParams()).toMatchObject({ mine: true })
    expect(lastParams()).not.toHaveProperty('departmentId')
    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument()
  })

  it('drops mine when a department is picked, and Reset brings it back', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'pick Law' }))
    expect(lastParams()).toMatchObject({ departmentId: 'd-2' })
    expect(lastParams()).not.toHaveProperty('mine')

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(lastParams()).toMatchObject({ mine: true })
    expect(lastParams()).not.toHaveProperty('departmentId')
  })
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
