import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CoursePage from './page'

const state = vi.hoisted(() => ({
  course: undefined as unknown,
  // Per-module note totals (limit-1 requests).
  moduleTotals: [0, 0, 0],
  noteTotal: 0,
  oldExamTotal: 0,
}))

vi.mock('@/src/lib/api/generated/courses/courses', () => ({
  useCoursesControllerFindOne: () => ({ data: state.course, isLoading: false }),
}))

vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-query')>()),
  useQueries: () =>
    state.moduleTotals.map((total) => ({
      isPending: false,
      data: { total, items: [] },
    })),
}))

vi.mock('@/src/lib/api/generated/posts/posts', () => ({
  getPostsControllerFindAllQueryOptions: () => ({ queryKey: ['modules'], queryFn: () => null }),
  usePostsControllerFindAll: (params: { type?: string }) => ({
    data:
      params.type === 'OLD_QUESTION'
        ? { total: state.oldExamTotal, items: [] }
        : params.type === 'NOTE'
          ? { total: state.noteTotal, items: [] }
          : { total: 0, items: [] },
    isLoading: false,
  }),
}))

vi.mock('@/components/course/up-next-card', () => ({
  UpNextCard: ({ modules }: { modules?: unknown[] }) => (
    <div data-testid="up-next">{modules ? `modules:${modules.length}` : 'loading'}</div>
  ),
}))
vi.mock('@/components/course/topics-list', () => ({ TopicsList: () => <div /> }))
vi.mock('@/components/course/materials-shelf', () => ({ MaterialsShelf: () => <div /> }))
vi.mock('@/components/course/exam-card', () => ({ ExamCard: () => <div /> }))

const course = {
  id: 'c1',
  code: 'CSC213',
  name: 'Data Structures',
  yearLevel: 2,
  department: { id: 'd1', name: 'Computer Science' },
}

// `use(params)` suspends until the promise resolves, so the render is awaited inside act.
async function renderPage() {
  await act(async () => {
    render(<CoursePage params={Promise.resolve({ id: 'c1' })} />)
  })
}

describe('CoursePage', () => {
  beforeEach(() => {
    state.course = course
    state.moduleTotals = [3, 4, 0]
    state.noteTotal = 7
    state.oldExamTotal = 1
  })

  it('shows the eyebrow and the note and old exam counts', async () => {
    await renderPage()

    expect(screen.getByText(/^CSC213 · Year 2 · Semester \d$/)).toBeInTheDocument()
    expect(screen.getByText('7 notes · 1 old exam')).toBeInTheDocument()
  })

  it('links to share a note for this course and shows the empty slots', async () => {
    await renderPage()

    expect(screen.getByRole('link', { name: '+ Share a note' })).toHaveAttribute(
      'href',
      '/posts/new?courseId=c1',
    )
    expect(screen.getByText('Helpers in this course')).toBeInTheDocument()
    expect(screen.getByText('Your activity')).toBeInTheDocument()
  })

  it('does not show Following or Course chat', async () => {
    await renderPage()

    expect(screen.queryByRole('button', { name: /follow/i })).toBeNull()
    expect(screen.queryByText(/course chat/i)).toBeNull()
  })

  it('passes the module counts to Up next once they have loaded', async () => {
    await renderPage()

    expect(screen.getByTestId('up-next')).toHaveTextContent('modules:3')
  })
})
