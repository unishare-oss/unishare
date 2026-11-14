import { Suspense } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import type { PostEntity } from '@/src/lib/api/generated/unishareAPI.schemas'
import CoursePage from '@/app/(app)/courses/[id]/page'

const mocks = vi.hoisted(() => ({
  firstPage: undefined as unknown,
  totals: { NOTE: 12, OLD_QUESTION: 3, EXERCISE: 2 } as Record<string, number>,
  fetchPage: vi.fn(),
}))

vi.mock('@/contexts/auth-context', () => ({ useAuth: () => ({ isAuthenticated: true }) }))
vi.mock('@/components/course/course-exam-card', () => ({ CourseExamCard: () => null }))
vi.mock('@/components/noto/noto', () => ({ Noto: () => null }))
vi.mock('@/src/lib/api/generated/courses/courses', () => ({
  useCoursesControllerFindOne: () => ({
    isPending: false,
    isError: false,
    data: {
      id: 'c-1',
      code: 'CSC213',
      name: 'Data Structures',
      yearLevel: 2,
      department: { id: 'd-1', name: 'CS', code: 'CS' },
    },
  }),
}))
vi.mock('@/src/lib/api/generated/posts/posts', () => ({
  usePostsControllerFindAll: (params: { type?: string }) => ({
    data: params.type ? mocks.totals[params.type] : mocks.firstPage,
  }),
  getPostsControllerFindAllQueryKey: (params: unknown) => ['posts', params],
  postsControllerFindAll: (params: unknown) => mocks.fetchPage(params),
}))

const post = (id: string, moduleNumber: number | null, type = 'NOTE') =>
  ({
    id,
    type,
    title: `Title ${id}`,
    moduleNumber,
    isAnonymous: false,
    author: { id: 'u', name: 'Ploy' },
    createdAt: '2026-01-01T00:00:00.000Z',
    files: [],
    _count: { comments: 0, savedBy: 0 },
  }) as unknown as PostEntity

const page = (items: PostEntity[], totalPages = 1) => ({
  items,
  total: items.length,
  page: 1,
  limit: 100,
  totalPages,
})

async function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  await act(async () => {
    render(
      <QueryClientProvider client={client}>
        <Suspense>
          <CoursePage params={Promise.resolve({ id: 'c-1' })} />
        </Suspense>
      </QueryClientProvider>,
    )
  })
}

describe('CoursePage', () => {
  beforeEach(() => {
    mocks.firstPage = page([post('a', 3), post('b', 9), post('c', null)])
    mocks.fetchPage.mockReset()
  })

  it('uses the singular for a count of one', async () => {
    mocks.totals = { NOTE: 1, OLD_QUESTION: 1, EXERCISE: 0 }
    await renderPage()
    expect(screen.getByText('1 note · 1 old exam · 0 exercises')).toBeInTheDocument()
    mocks.totals = { NOTE: 12, OLD_QUESTION: 3, EXERCISE: 2 }
  })

  it('shows the course code, name and post counts from totals', async () => {
    await renderPage()
    expect(screen.getByRole('heading', { level: 1, name: 'Data Structures' })).toBeInTheDocument()
    expect(screen.getByText(/CSC213/, { selector: 'span.font-mono' })).toBeInTheDocument()
    expect(screen.getByText('12 notes · 3 old exams · 2 exercises')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Share a note/ })).toHaveAttribute(
      'href',
      '/posts/new?courseId=c-1',
    )
  })

  it("Up next links to the highest module's newest post", async () => {
    await renderPage()
    const upNext = screen.getByRole('region', { name: 'Title b' })
    expect(within(upNext).getByText(/Module 9/)).toBeInTheDocument()
    expect(within(upNext).getByRole('link', { name: 'Read the note' })).toHaveAttribute(
      'href',
      '/posts/b',
    )
  })

  it('names the true highest module when the course has more than 100 posts', async () => {
    mocks.firstPage = page([post('new', 3)], 2)
    mocks.fetchPage.mockResolvedValue({ data: page([post('old', 12)], 2) })
    await renderPage()
    const upNext = await screen.findByRole('region', { name: 'Title old' })
    expect(within(upNext).getByText(/Module 12/)).toBeInTheDocument()
  })

  it('shows placeholders, not zeros or an empty shelf, while data loads', async () => {
    mocks.firstPage = undefined
    mocks.totals = {} as Record<string, number>
    await renderPage()
    expect(screen.queryByText(/0 notes/)).not.toBeInTheDocument()
    expect(screen.queryByText('Nothing here yet.')).not.toBeInTheDocument()
    mocks.totals = { NOTE: 12, OLD_QUESTION: 3, EXERCISE: 2 }
  })

  it('a course with 250 posts across 3 pages shows every module with correct counts', async () => {
    const make = (from: number, n: number) =>
      Array.from({ length: n }, (_, i) => post(`p${from + i}`, ((from + i) % 4) + 1))
    mocks.firstPage = page(make(0, 100), 3)
    let resolve3!: (v: unknown) => void
    mocks.fetchPage.mockImplementation(({ page: n }: { page: number }) =>
      n === 3
        ? new Promise((r) => (resolve3 = r))
        : Promise.resolve({ data: page(make(100, 100), 3) }),
    )
    await renderPage()
    // Page 3 is still pending: the header and the shelf render while Topics shows its skeleton.
    expect(screen.getByRole('heading', { level: 1, name: 'Data Structures' })).toBeInTheDocument()
    expect(screen.getByText(/CSC213/, { selector: 'span.font-mono' })).toBeInTheDocument()
    expect(screen.getByText('12 notes · 3 old exams · 2 exercises')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Course materials' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Topics' })).toHaveAttribute('aria-labelledby')
    expect(screen.queryByRole('button', { name: /Module 1/ })).not.toBeInTheDocument()

    await act(async () => resolve3({ data: page(make(200, 50), 3) }))
    // Modules 1..4 hold 250 posts: 63, 63, 62, 62.
    const counts = [63, 63, 62, 62]
    for (const [i, count] of counts.entries()) {
      const row = await screen.findByRole('button', { name: new RegExp(`Module ${i + 1}`) })
      expect(row).toHaveTextContent(String(count))
    }
    await waitFor(() => expect(mocks.fetchPage).toHaveBeenCalledTimes(2))
    expect(mocks.fetchPage.mock.calls.map(([p]) => p.page).sort()).toEqual([2, 3])
  })
})
