import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ImportTimetableDialog } from './import-timetable-dialog'

const mocks = vi.hoisted(() => ({
  parseImport: vi.fn(),
  bulkCreate: vi.fn(),
}))

vi.mock('@/src/lib/api/generated/exams/exams', async () => {
  const { useMutation } = await import('@tanstack/react-query')
  return {
    useExamsControllerParseImport: () => useMutation({ mutationFn: mocks.parseImport }),
    useExamsControllerBulkCreate: () => useMutation({ mutationFn: mocks.bulkCreate }),
    getExamsControllerFindAllQueryKey: () => ['exams'],
  }
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
  window.scrollTo = vi.fn()
})

describe('ImportTimetableDialog', () => {
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
    mocks.bulkCreate.mockResolvedValue({ data: [{ id: 'exam-1' }] })
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
    fireEvent.click(screen.getByRole('button', { name: 'Publish 1 exams' }))

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
    expect(await screen.findByText('1 exams added to the calendar.')).toBeInTheDocument()
  })
})
