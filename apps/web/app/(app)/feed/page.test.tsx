import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { guestPhoneTabs } from '@/components/navigation/navigation-config'
import { useFeedStore } from '@/lib/store'

const mocks = vi.hoisted(() => ({
  exams: [] as unknown[],
  postQueries: [] as Record<string, unknown>[],
  auth: {
    user: { name: 'Mya Aye', department: { id: 'd-1', name: 'CPE' }, yearLevel: null } as unknown,
    isAuthenticated: true,
    isGuest: false,
    isLoading: false,
  },
  examRequests: [] as unknown[],
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => mocks.auth,
}))
vi.mock('@/hooks/use-my-departments', () => ({
  useMyDepartments: () => ({
    departments: [{ id: 'd-1', name: 'CPE' }],
    loaded: true,
    noUniversity: false,
  }),
}))
vi.mock('@/src/lib/api/generated/courses/courses', () => ({
  useCoursesControllerFindAll: () => ({
    data: {
      items: [
        {
          id: 'c-1',
          code: 'CSC213',
          name: 'Data Structures',
          yearLevel: 2,
          department: { id: 'd-1' },
        },
      ],
    },
  }),
}))
vi.mock('@/src/lib/api/generated/exams/exams', () => ({
  useExamsControllerFindAll: (
    _params: unknown,
    options: { query?: { enabled?: boolean } } = {},
  ) => {
    if (options.query?.enabled === false) return { data: undefined, isLoading: false }
    mocks.examRequests.push(_params)
    return { data: mocks.exams, isLoading: false }
  },
}))
vi.mock('@/src/lib/api/generated/posts/posts', () => ({
  usePostsControllerFindAll: (params: Record<string, unknown>) => {
    mocks.postQueries.push(params)
    return { data: { items: [], totalPages: 1 }, isLoading: false }
  },
}))
vi.mock('@/components/my-courses-card', () => ({ MyCoursesCard: () => null }))
vi.mock('@/components/noto/noto', () => ({ Noto: () => <div data-testid="noto" /> }))

const { default: FeedPage } = await import('./page')
const { metadata } = await import('./layout')

// Radix Select needs these in jsdom.
Element.prototype.hasPointerCapture = () => false
Element.prototype.releasePointerCapture = () => {}
Element.prototype.scrollIntoView = () => {}

function renderPage() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <FeedPage />
    </QueryClientProvider>,
  )
}

const lastQuery = () => mocks.postQueries.filter((q) => q.limit === 10).at(-1)

beforeEach(() => {
  mocks.exams = []
  mocks.postQueries = []
  mocks.examRequests = []
  mocks.auth = {
    user: { name: 'Mya Aye', department: { id: 'd-1', name: 'CPE' }, yearLevel: null },
    isAuthenticated: true,
    isGuest: false,
    isLoading: false,
  }
  useFeedStore.setState({
    activeFilter: 'ALL',
    selectedDeptId: null,
    selectedYear: null,
    hasSelectedYear: true,
    selectedCourseId: '',
    selectedModuleNumber: null,
  })
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => ({ data: { posts: [], total: 0 } }) })),
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

async function choose(user: ReturnType<typeof userEvent.setup>, select: string, option: string) {
  await user.click(screen.getByRole('combobox', { name: select }))
  await user.click(await screen.findByRole('option', { name: option }))
}

describe('Today page', () => {
  it('titles the page Today', () => {
    expect(metadata.title).toBe('Today')
    expect(guestPhoneTabs[0].label).toBe('Today')
    renderPage()
    expect(screen.queryByRole('heading', { name: 'Feed' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Your feed' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('hides the hero and shows the Noto line with no upcoming exams', () => {
    renderPage()
    expect(screen.queryByRole('link', { name: /Revise/ })).not.toBeInTheDocument()
    expect(screen.getByTestId('noto')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/No exams on your calendar/)
    expect(screen.getByRole('heading', { level: 2, name: 'Your feed' })).toBeInTheDocument()
    expect(screen.getByText('No posts found')).toBeInTheDocument()
  })

  it('shows the hero for a member with an upcoming exam', () => {
    const startsAt = new Date()
    startsAt.setDate(startsAt.getDate() + 3)
    mocks.exams = [
      {
        id: 'e-1',
        title: 'Final',
        startsAt: startsAt.toISOString(),
        course: { id: 'c-1', code: 'CSC213' },
      },
    ]
    renderPage()
    expect(screen.getByRole('link', { name: 'Revise CSC213' })).toHaveAttribute(
      'href',
      '/courses/c-1',
    )
  })

  it('makes no exams request for a guest or a member without a department', () => {
    mocks.auth = { user: null, isAuthenticated: false, isGuest: true, isLoading: false }
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent(/Sign in to see your exams/)
    cleanup()
    mocks.auth = {
      user: { name: 'Mya Aye', department: null, yearLevel: null },
      isAuthenticated: true,
      isGuest: false,
      isLoading: false,
    }
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent(/Add your department/)
    expect(mocks.examRequests).toEqual([])
  })

  it('shows no greeting line while auth loads', () => {
    mocks.auth = { user: null, isAuthenticated: false, isGuest: false, isLoading: true }
    renderPage()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('each filter narrows the list', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Past exams' }))
    expect(lastQuery()).toMatchObject({ type: 'OLD_QUESTION' })

    await choose(user, 'Year', 'Year 2')
    expect(lastQuery()).toMatchObject({ yearLevel: 2 })

    await choose(user, 'Module', 'Module 3')
    expect(lastQuery()).toMatchObject({ moduleNumber: 3 })

    await choose(user, 'Course', 'CSC213 — Data Structures')
    expect(lastQuery()).toMatchObject({
      type: 'OLD_QUESTION',
      yearLevel: 2,
      moduleNumber: 3,
      courseId: 'c-1',
    })

    await choose(user, 'Sort', 'Trending')
    await waitFor(() =>
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        '/api/posts/trending?page=1&limit=10',
        expect.anything(),
      ),
    )
    // The controls stay visible while trending ignores them.
    expect(screen.getByRole('combobox', { name: 'Year' })).toBeInTheDocument()
  })
})
