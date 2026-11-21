import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ImportTimetableDialog } from './import-timetable-dialog'

const mocks = vi.hoisted(() => ({
  parseImport: vi.fn(),
  bulkCreate: vi.fn(),
  courses: [] as Array<{ id: string; code: string; name: string }>,
  role: 'MODERATOR',
}))

vi.mock('@/src/lib/api/generated/exams/exams', async () => {
  const { useMutation } = await import('@tanstack/react-query')
  return {
    useExamsControllerParseImport: () => useMutation({ mutationFn: mocks.parseImport }),
    useExamsControllerBulkCreate: () => useMutation({ mutationFn: mocks.bulkCreate }),
    getExamsControllerFindAllQueryKey: () => ['exams'],
  }
})
vi.mock('@/src/lib/api/generated/courses/courses', () => ({
  useCoursesControllerFindAll: () => ({ data: { items: mocks.courses } }),
}))
vi.mock('@/contexts/auth-context', () => ({ useAuth: () => ({ user: { role: mocks.role } }) }))
vi.mock('@/src/lib/api/generated/universities/universities', () => ({
  useUniversitiesControllerFindAll: () => ({
    data: [
      { id: 'university-1', name: 'Example University', shortName: 'EU' },
      { id: 'university-2', name: 'Other University', shortName: 'OU' },
    ],
  }),
}))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  mocks.courses = []
  mocks.role = 'MODERATOR'
})

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.releasePointerCapture ??= () => {}
  window.scrollTo = vi.fn()
})

describe('ImportTimetableDialog', () => {
  it('requires admins to choose a university before reading and submits the choice', async () => {
    mocks.role = 'ADMIN'
    mocks.parseImport.mockResolvedValue({ data: { rows: [] } })
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ImportTimetableDialog open onOpenChange={vi.fn()} />
      </QueryClientProvider>,
    )

    const selectedFile = new File(['timetable'], 'term.pdf', { type: 'application/pdf' })
    fireEvent.change(screen.getByLabelText('Choose exam timetable file'), {
      target: { files: [selectedFile] },
    })
    expect(screen.getByRole('button', { name: 'Read timetable' })).toBeDisabled()

    await userEvent.click(screen.getByRole('combobox', { name: 'University' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Example University (EU)' }))
    expect(screen.getByRole('button', { name: 'Read timetable' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'Read timetable' }))
    await waitFor(() =>
      expect(mocks.parseImport.mock.calls[0]?.[0]).toEqual({
        data: { file: selectedFile, universityId: 'university-1' },
      }),
    )
  })

  it('does not show the university picker to moderators', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ImportTimetableDialog open onOpenChange={vi.fn()} />
      </QueryClientProvider>,
    )

    expect(screen.queryByRole('combobox', { name: 'University' })).not.toBeInTheDocument()
  })

  it('selects a file, reads it on request, reviews rows, then publishes', async () => {
    let finishParsing:
      ((value: { data: { rows: Array<Record<string, unknown>> } }) => void) | null = null
    mocks.parseImport.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishParsing = resolve
        }),
    )
    const parsedResult = {
      data: {
        rows: [
          {
            courseCode: 'CS101',
            courseId: 'course-1',
            courseName: 'Programming',
            candidates: [],
            existingExams: [],
            date: '2026-12-10',
            startsAt: '09:00',
            endsAt: '12:00',
            title: 'Final exam',
            examRoom: 'A-101',
            matchStatus: 'matched',
          },
        ],
      },
    }
    mocks.bulkCreate.mockResolvedValue({ data: { created: [{ id: 'exam-1' }], skipped: [] } })
    const onOpenChange = vi.fn()
    const queryClient = new QueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <ImportTimetableDialog open onOpenChange={onOpenChange} />
      </QueryClientProvider>,
    )

    const selectedFile = new File(['timetable'], 'term.pdf', { type: 'application/pdf' })
    fireEvent.change(screen.getByLabelText('Choose exam timetable file'), {
      target: { files: [selectedFile] },
    })

    expect(screen.getByText('term.pdf')).toBeInTheDocument()
    expect(screen.getByText('9 bytes')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Read timetable' })).toBeEnabled()
    expect(mocks.parseImport).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Read timetable' }))
    expect(await screen.findByText('Reading your timetable')).toBeInTheDocument()
    expect(mocks.parseImport.mock.calls[0][0]).toEqual({ data: { file: selectedFile } })
    expect(screen.getByText(/Nothing is published until you confirm/)).toBeInTheDocument()
    await act(async () => {
      finishParsing?.(parsedResult)
    })

    expect(await screen.findByLabelText('Title for row 1')).toHaveValue('Final exam')
    const table = screen.getByRole('table')
    expect(screen.getByRole('columnheader', { name: 'Course' })).toBeInTheDocument()
    expect(table).toHaveClass('min-w-[1000px]')
    expect(table.parentElement).toHaveClass('overflow-x-auto')
    expect(table.querySelectorAll('col')[3]).toHaveStyle({ width: '128px' })
    expect(table.querySelectorAll('col')[6]).toHaveStyle({ width: '48px' })
    expect(screen.getByLabelText('Start time for row 1')).toBeInTheDocument()
    expect(screen.getByLabelText('End time for row 1')).toBeInTheDocument()
    expect(screen.getByText('1 matched')).toBeInTheDocument()
    expect(screen.getByText(/Exams starting within 14 days/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Title for row 1'), {
      target: { value: 'Updated final' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Publish 1 exam' }))

    await waitFor(() => {
      expect(mocks.bulkCreate.mock.calls[0]?.[0]).toEqual({
        data: {
          exams: [
            {
              courseId: 'course-1',
              title: 'Updated final',
              startsAt: new Date('2026-12-10T09:00:00').toISOString(),
              endsAt: new Date('2026-12-10T12:00:00').toISOString(),
              examRoom: 'A-101',
            },
          ],
        },
      })
    })
    expect(
      await screen.findByRole('heading', { name: 'Exams added to the calendar' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('group', { name: '1 exam created' })).toBeInTheDocument()
    const skippedStat = screen.getByRole('group', { name: '0 skipped' })
    expect(skippedStat).toHaveTextContent('skipped')
    expect(skippedStat).not.toHaveTextContent('already on the calendar')
  })

  it('shows a moved warning and created/skipped counts after publishing', async () => {
    mocks.parseImport.mockResolvedValue({
      data: {
        rows: [
          {
            courseCode: 'CS101',
            courseId: 'course-1',
            courseName: 'Programming',
            candidates: [],
            existingExams: [
              {
                id: 'exam-existing',
                title: '  FINAL EXAM  ',
                startsAt: '2026-12-09T02:00:00.000Z',
                endsAt: null,
                examRoom: null,
              },
            ],
            date: '2026-12-10',
            startsAt: '09:00',
            endsAt: null,
            title: 'Final exam',
            examRoom: null,
            matchStatus: 'matched',
          },
          {
            courseCode: 'CS101',
            courseId: 'course-1',
            courseName: 'Programming',
            candidates: [],
            existingExams: [],
            date: '2026-12-10',
            startsAt: '09:00',
            endsAt: null,
            title: 'Duplicate final exam',
            examRoom: null,
            matchStatus: 'matched',
          },
          {
            courseCode: 'CS102',
            courseId: 'course-2',
            courseName: 'Data Structures',
            candidates: [],
            existingExams: [],
            date: '2026-12-16',
            startsAt: '09:00',
            endsAt: null,
            title: 'Algorithms exam',
            examRoom: null,
            matchStatus: 'matched',
          },
        ],
      },
    })
    mocks.bulkCreate.mockResolvedValue({
      data: {
        created: [{ id: 'exam-new' }],
        skipped: [
          { index: 0, reason: 'existing' },
          { index: 1, reason: 'duplicate_in_request' },
        ],
      },
    })

    render(
      <QueryClientProvider client={new QueryClient()}>
        <ImportTimetableDialog open onOpenChange={vi.fn()} />
      </QueryClientProvider>,
    )

    fireEvent.change(screen.getByLabelText('Choose exam timetable file'), {
      target: { files: [new File(['timetable'], 'term.pdf', { type: 'application/pdf' })] },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Read timetable' }))

    const movedWarnings = await screen.findAllByText(/Already has an exam on/)
    expect(movedWarnings).toHaveLength(2)
    expect(movedWarnings[0]).toHaveTextContent(
      /Already has an exam on .+\. Moved\? Delete the old one after publishing\./,
    )
    expect(
      within(screen.getByLabelText('Exam row 2')).queryByText(/Already has an exam on/),
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Publish 3 exams' }))

    expect(
      await screen.findByRole('heading', { name: 'Exams added to the calendar' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('group', { name: '1 exam created' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: '2 skipped' })).toBeInTheDocument()
    expect(screen.getAllByText('CS101')).toHaveLength(2)
    expect(
      screen.getByText('Programming · 10 Dec, 09:00 · already on the calendar'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Programming · 10 Dec, 09:00 · duplicate row in this file'),
    ).toBeInTheDocument()
  })

  it('describes duplicate-only skips without mentioning zero existing exams', async () => {
    mocks.parseImport.mockResolvedValue({
      data: {
        rows: [
          {
            courseCode: 'CS101',
            courseId: 'course-1',
            courseName: 'Programming',
            candidates: [],
            existingExams: [],
            date: '2026-12-10',
            startsAt: '09:00',
            endsAt: null,
            title: 'Final exam',
            examRoom: null,
            matchStatus: 'matched',
          },
        ],
      },
    })
    mocks.bulkCreate.mockResolvedValue({
      data: { created: [], skipped: [{ index: 0, reason: 'duplicate_in_request' }] },
    })

    render(
      <QueryClientProvider client={new QueryClient()}>
        <ImportTimetableDialog open onOpenChange={vi.fn()} />
      </QueryClientProvider>,
    )

    fireEvent.change(screen.getByLabelText('Choose exam timetable file'), {
      target: { files: [new File(['timetable'], 'term.pdf', { type: 'application/pdf' })] },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Read timetable' }))
    await screen.findByLabelText('Title for row 1')
    fireEvent.click(screen.getByRole('button', { name: 'Publish 1 exam' }))

    const skippedStat = await screen.findByRole('group', { name: '1 skipped' })
    expect(skippedStat).toHaveTextContent('1 duplicate row in this file')
    expect(skippedStat).not.toHaveTextContent(/\b0 already on the calendar/)
    expect(
      screen.getByText('Programming · 10 Dec, 09:00 · duplicate row in this file'),
    ).toBeInTheDocument()
  })

  it.each([
    {
      label: 'an existing exam at the same start',
      title: 'Final exam',
      startsAt: new Date('2026-12-10T09:00:00').toISOString(),
    },
    {
      label: 'a different-title exam at another time',
      title: 'Midterm',
      startsAt: '2026-12-09T02:00:00.000Z',
    },
  ])('does not show a moved warning for $label', async ({ title, startsAt }) => {
    mocks.parseImport.mockResolvedValue({
      data: {
        rows: [
          {
            courseCode: 'CS101',
            courseId: 'course-1',
            courseName: 'Programming',
            candidates: [],
            existingExams: [{ id: 'exam-existing', title, startsAt, endsAt: null, examRoom: null }],
            date: '2026-12-10',
            startsAt: '09:00',
            endsAt: null,
            title: 'Final exam',
            examRoom: null,
            matchStatus: 'matched',
          },
        ],
      },
    })

    render(
      <QueryClientProvider client={new QueryClient()}>
        <ImportTimetableDialog open onOpenChange={vi.fn()} />
      </QueryClientProvider>,
    )

    fireEvent.change(screen.getByLabelText('Choose exam timetable file'), {
      target: { files: [new File(['timetable'], 'term.pdf', { type: 'application/pdf' })] },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Read timetable' }))

    expect(await screen.findByLabelText('Title for row 1')).toHaveValue('Final exam')
    expect(screen.queryByText(/Already has an exam on/)).not.toBeInTheDocument()
  })

  it('lets moderators pick ambiguous courses and search for unmatched courses', async () => {
    const user = userEvent.setup()
    mocks.courses = [
      { id: 'course-math-1', code: 'MATH201', name: 'Calculus II' },
      { id: 'course-math-2', code: 'MATH220', name: 'Linear Algebra' },
    ]
    mocks.parseImport.mockResolvedValue({
      data: {
        rows: [
          {
            courseCode: 'CSC219',
            courseId: null,
            courseName: null,
            candidates: [
              {
                id: 'course-csc-1',
                code: 'CSC219',
                name: 'Data Structures',
                departmentName: 'Computer Science',
              },
              {
                id: 'course-csc-2',
                code: 'CSC 219',
                name: 'Algorithms',
                departmentName: 'Computing',
              },
            ],
            existingExams: [],
            date: '2026-12-10',
            startsAt: '09:00',
            endsAt: null,
            title: 'Final exam',
            examRoom: null,
            matchStatus: 'ambiguous',
          },
          {
            courseCode: 'MATH999',
            courseId: null,
            courseName: null,
            candidates: [],
            existingExams: [],
            date: '2026-12-11',
            startsAt: '09:00',
            endsAt: null,
            title: 'Final exam',
            examRoom: null,
            matchStatus: 'unmatched',
          },
          {
            courseCode: 'MATH998',
            courseId: null,
            courseName: null,
            candidates: [],
            existingExams: [],
            date: '2026-12-12',
            startsAt: '09:00',
            endsAt: null,
            title: 'Final exam',
            examRoom: null,
            matchStatus: 'unmatched',
          },
        ],
      },
    })

    render(
      <QueryClientProvider client={new QueryClient()}>
        <ImportTimetableDialog open onOpenChange={vi.fn()} />
      </QueryClientProvider>,
    )

    fireEvent.change(screen.getByLabelText('Choose exam timetable file'), {
      target: { files: [new File(['timetable'], 'term.pdf', { type: 'application/pdf' })] },
    })
    await user.click(screen.getByRole('button', { name: 'Read timetable' }))

    const ambiguousRow = await screen.findByLabelText('Exam row 1')
    const ambiguousPicker = within(ambiguousRow).getByRole('combobox', {
      name: 'Course for row 1',
    })
    expect(within(ambiguousRow).getAllByText('Pick a course')).toHaveLength(2)
    await user.click(ambiguousPicker)
    await user.click(
      await screen.findByRole('option', { name: 'CSC 219 — Algorithms (Computing)' }),
    )
    expect(within(ambiguousRow).getByText('Picked')).toBeInTheDocument()
    expect(within(ambiguousRow).getByText('Algorithms')).toBeInTheDocument()
    await user.click(within(ambiguousRow).getByRole('combobox', { name: 'Course for row 1' }))
    await user.click(
      await screen.findByRole('option', {
        name: 'CSC219 — Data Structures (Computer Science)',
      }),
    )
    expect(within(ambiguousRow).getByText('Data Structures')).toBeInTheDocument()

    const searchableRow = screen.getByLabelText('Exam row 2')
    const search = within(searchableRow).getByRole('textbox', { name: 'Course for row 2' })
    await user.click(search)
    await user.keyboard('no such course')
    expect(screen.getByText('No results found...')).toBeInTheDocument()
    expect(within(searchableRow).getByText('Course not found')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Publish 3 exams' })).toBeDisabled()

    await user.keyboard('{Control>}a{/Control}{Backspace}Calculus II')
    const courseOption = await screen.findByText('MATH201 — Calculus II')
    const popover = courseOption.closest('[data-slot="popover-content"]')
    expect(popover).not.toBeNull()
    expect(popover?.closest('[data-slot="dialog-content"]')).not.toBeNull()
    await user.keyboard('{ArrowDown}{Enter}')
    expect(within(searchableRow).getByText('Picked')).toBeInTheDocument()

    const removableRow = screen.getByLabelText('Exam row 3')
    const removableSearch = within(removableRow).getByRole('textbox', { name: 'Course for row 3' })
    await user.click(removableSearch)
    await user.keyboard('nothing matches')
    const noResults = screen.getByText('No results found...')
    expect(noResults.closest('[data-slot="popover-content"]')).not.toBeNull()
    await user.keyboard('{Escape}')
    expect(screen.queryByText('No results found...')).not.toBeInTheDocument()

    await user.click(removableSearch)
    await user.keyboard('MATH')
    expect(await screen.findByText('MATH201 — Calculus II')).toBeInTheDocument()
    await user.click(within(removableRow).getByText('Course not found'))
    expect(screen.queryByText('MATH201 — Calculus II')).not.toBeInTheDocument()

    await user.click(within(removableRow).getByRole('button', { name: 'Remove row 3' }))

    expect(screen.queryByLabelText('Exam row 3')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Publish 2 exams' })).toBeEnabled()
  })
})
