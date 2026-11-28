import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MyCoursesDialog } from './my-courses-dialog'

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  invalidateQueries: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  mutationOptions: null as null | { onSuccess: () => void; onError: () => void },
  courses: [
    { id: 'a', code: 'CSC213', name: 'Data Structures', yearLevel: 2 },
    { id: 'b', code: 'CSC311', name: 'Operating Systems', yearLevel: 3 },
    { id: 'c', code: 'CSC290', name: 'Special Topics', yearLevel: null },
    { id: 'd', code: 'CSC499', name: 'Saved course', yearLevel: 4 },
  ],
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}))
vi.mock('@/src/lib/api/generated/courses/courses', () => ({
  useCoursesControllerFindAll: () => ({ data: { items: mocks.courses } }),
}))
vi.mock('@/src/lib/api/generated/users/users', () => ({
  getMyCoursesControllerGetMineQueryKey: () => ['/api/users/me/courses'],
  useMyCoursesControllerSaveMine: (options: {
    mutation: { onSuccess: () => void; onError: () => void }
  }) => {
    mocks.mutationOptions = options.mutation
    return { mutate: mocks.mutate, isPending: false }
  },
}))
vi.mock('@/src/lib/api/generated/exams/exams', () => ({
  getExamsControllerFindAllQueryKey: () => ['/api/exams'],
}))
vi.mock('sonner', () => ({ toast: { error: mocks.toastError, success: mocks.toastSuccess } }))

const courses = {
  academicYear: 2026,
  automatic: [mocks.courses[0]],
  removed: [],
  added: [],
  final: [mocks.courses[0]],
  confirmed: false,
}

describe('MyCoursesDialog', () => {
  beforeEach(() => vi.clearAllMocks())

  it('unticks an automatic course and saves the final list', async () => {
    render(<MyCoursesDialog courses={courses} departmentId="d1" onOpenChange={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Your courses for 2026/27' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: /CSC213 Data Structures/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Save 0 courses' }))

    await waitFor(() => expect(mocks.mutate).toHaveBeenCalledWith({ data: { courseIds: [] } }))
  })

  it('searches own-department courses, shows their year, and adds one', async () => {
    render(<MyCoursesDialog courses={courses} departmentId="d1" onOpenChange={vi.fn()} />)

    fireEvent.change(screen.getByRole('textbox', { name: 'Search department courses' }), {
      target: { value: 'operating' },
    })
    expect(screen.getByText('Year 3')).toBeInTheDocument()
    expect(screen.queryByText('Special Topics')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: /CSC311 Operating Systems Year 3/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Save 2 courses' }))

    await waitFor(() =>
      expect(mocks.mutate).toHaveBeenCalledWith({ data: { courseIds: ['a', 'b'] } }),
    )
  })

  it('shows a saved course outside the loaded results so it can be unticked', () => {
    render(
      <MyCoursesDialog
        courses={{ ...courses, final: [...courses.final, mocks.courses[3]] }}
        departmentId="d1"
        onOpenChange={vi.fn()}
      />,
    )
    const checkbox = screen.getByRole('checkbox', { name: /CSC499 Saved course/ })
    expect(checkbox).toBeChecked()
    fireEvent.click(checkbox)
    expect(checkbox).not.toBeChecked()
  })

  it('invalidates the card query, closes, and toasts after a successful save', async () => {
    const onOpenChange = vi.fn()
    render(<MyCoursesDialog courses={courses} departmentId="d1" onOpenChange={onOpenChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Save 1 course' }))
    mocks.mutationOptions?.onSuccess()

    await waitFor(() => expect(mocks.invalidateQueries).toHaveBeenCalledTimes(2))
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['/api/users/me/courses'] })
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['/api/exams'] })
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(mocks.toastSuccess).toHaveBeenCalledWith(
      'Saved. Reminders follow your 1 course this year.',
    )
  })

  it('keeps the dialog open and shows a failure toast when saving fails', () => {
    const onOpenChange = vi.fn()
    render(<MyCoursesDialog courses={courses} departmentId="d1" onOpenChange={onOpenChange} />)
    mocks.mutationOptions?.onError()

    expect(mocks.toastError).toHaveBeenCalledWith('Failed to save courses')
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('shows the empty automatic wording and an Any year option', () => {
    render(
      <MyCoursesDialog
        courses={{ ...courses, automatic: [], final: [] }}
        departmentId="d1"
        onOpenChange={vi.fn()}
      />,
    )

    expect(
      screen.getByText(
        'We found no courses for your year. Add the ones you take from your department.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Any year')).toBeInTheDocument()
  })

  it('focuses Save on open, or search when there are no automatic courses', async () => {
    const { unmount } = render(
      <MyCoursesDialog courses={courses} departmentId="d1" onOpenChange={vi.fn()} />,
    )
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save 1 course' })).toHaveFocus())
    unmount()

    render(
      <MyCoursesDialog
        courses={{ ...courses, automatic: [], final: [] }}
        departmentId="d1"
        onOpenChange={vi.fn()}
      />,
    )
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'Search department courses' })).toHaveFocus(),
    )
  })
})
