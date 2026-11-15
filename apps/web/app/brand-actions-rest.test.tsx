import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement } from 'react'

const fixtures = vi.hoisted(() => {
  // Every generated hook returns an empty query or mutation unless a screen overrides it.
  const hookStub = (data?: unknown) => () => ({
    data,
    isLoading: false,
    isPending: false,
    isError: false,
    isSuccess: true,
    isFetching: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    error: null,
    refetch: () => undefined,
    fetchNextPage: () => undefined,
    mutate: () => undefined,
    mutateAsync: () => Promise.resolve(undefined),
  })

  // Keeps the real module's non-hook exports (types, query keys) and swaps every `use*` hook for
  // a stub. `overrides` supplies the data a screen needs to show its real content.
  const generated =
    (overrides: Record<string, () => unknown> = {}) =>
    async (importOriginal: () => Promise<object>) => {
      const actual = (await importOriginal()) as Record<string, unknown>
      return Object.fromEntries(
        Object.keys(actual).map((key) => [
          key,
          key.startsWith('use') ? (overrides[key] ?? hookStub()) : actual[key],
        ]),
      )
    }

  const USER = {
    id: 'u1',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    bio: 'Studies computing',
    enrollmentYear: 2024,
    role: 'STUDENT',
    department: { id: 'd1', name: 'Computer Science' },
    image: null,
  }

  const EDIT_POST = {
    id: '1',
    title: 'Week 3 notes',
    description: 'Lecture notes',
    type: 'NOTE',
    year: 2026,
    semester: 1,
    moduleNumber: 1,
    examYear: null,
    externalUrl: null,
    isAnonymous: false,
    isOwner: true,
    author: { id: 'u1', name: 'Ada Lovelace' },
    course: { id: 'c1', code: 'CS101', department: { id: 'd1', name: 'Computer Science' } },
    files: [],
    tags: [],
  }

  const REPORT = {
    id: 'r1',
    reason: 'SPAM',
    status: 'PENDING',
    comment: null,
    createdAt: '2026-11-01T00:00:00.000Z',
    reporter: { id: 'u2', name: 'Grace Reporter' },
    post: {
      id: 'p1',
      title: 'Week 3 notes',
      type: 'NOTE',
      course: { code: 'CS101', department: { name: 'Computer Science' } },
    },
    adminAction: null,
  }

  const REQUEST = {
    id: 'q1',
    title: 'Need CS101 week 3 notes',
    description: 'Anyone with the lecture notes?',
    status: 'OPEN',
    createdAt: '2026-11-01T00:00:00.000Z',
    upvoteCount: 2,
    isUpvoted: false,
    author: { id: 'u2', name: 'Grace Reporter' },
    course: { id: 'c1', code: 'CS101', name: 'Intro' },
    fulfilledByPost: null,
  }

  const ROOM = {
    slug: 'study-room',
    title: 'Study room',
    visibility: 'PUBLIC',
    hasPassword: false,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  }

  const USER_ROW = {
    id: 'u1',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    role: 'STUDENT',
    banned: false,
    createdAt: '2026-11-01T00:00:00.000Z',
  }

  return { hookStub, generated, USER, EDIT_POST, REPORT, REQUEST, ROOM, USER_ROW }
})

vi.mock(
  '@/src/lib/api/generated/posts/posts',
  fixtures.generated({
    usePostsControllerFindOne: () => ({
      data: fixtures.EDIT_POST,
      isLoading: false,
      isPending: false,
    }),
  }),
)
vi.mock(
  '@/src/lib/api/generated/admin/admin',
  fixtures.generated({
    useAdminReportsControllerListReports: () => ({
      data: { reports: [fixtures.REPORT], total: 1 },
    }),
  }),
)
vi.mock(
  '@/src/lib/api/generated/post-requests/post-requests',
  fixtures.generated({
    usePostRequestsControllerFindAll: () => ({
      data: { items: [fixtures.REQUEST], totalPages: 1 },
      isLoading: false,
    }),
  }),
)
vi.mock(
  '@/src/lib/api/generated/collab/collab',
  fixtures.generated({
    useCollabControllerFindByOwner: () => ({ data: [fixtures.ROOM], isLoading: false }),
  }),
)
vi.mock('@/src/lib/api/generated/notifications/notifications', fixtures.generated())
vi.mock('@/src/lib/api/generated/reading-lists/reading-lists', fixtures.generated())
vi.mock('@/src/lib/api/generated/follows/follows', fixtures.generated())
vi.mock('@/src/lib/api/generated/users/users', fixtures.generated())
vi.mock('@/src/lib/api/generated/courses/courses', fixtures.generated())
vi.mock('@/src/lib/api/generated/departments/departments', fixtures.generated())
vi.mock('@/src/lib/api/generated/files/files', fixtures.generated())
vi.mock('@/hooks/use-crypto', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useCrypto: () => ({}),
}))
vi.mock('@/hooks/use-chat-socket', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useChatSocket: () => ({}),
}))
vi.mock('@/hooks/use-my-departments', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useMyDepartments: () => ({ departments: [], isLoading: false, noUniversity: false }),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined, replace: () => undefined, back: () => undefined }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ id: '1', roomId: '1' }),
}))
vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'u1', name: 'Ada Lovelace', email: 'ada@example.com', role: 'ADMIN', image: null },
    session: { user: { id: 'u1' } },
    isAuthenticated: true,
    isGuest: false,
    isLoading: false,
    isAdmin: true,
  }),
}))

const { default: EditPostPage } = await import('./(app)/(protected)/posts/[id]/edit/page')
const { default: AdminReportsPage } = await import('./(app)/(protected)/admin/reports/page')
const { default: AdminUsersPage } = await import('./(app)/(protected)/admin/users/page')
const { default: RequestsPage } = await import('./(app)/(protected)/requests/page')
const { default: BoardsPage } = await import('./(app)/(protected)/boards/page')
const { default: SavedPage } = await import('./(app)/saved/page')
const { default: NotificationsPage } = await import('./(app)/(protected)/notifications/page')
const { default: MyPostsPage } = await import('./(app)/(protected)/my-posts/page')
const { default: ChatPage } = await import('./(app)/chat/page')
const { default: DepartmentPage } = await import('./(app)/departments/[id]/page')
const { default: UserProfilePage } = await import('./(app)/users/[id]/page')
const { EditProfileForm } = await import('@/components/profile/edit-profile-form')
const { AddCourseModal } = await import('@/components/admin/departments/add-course-modal')

// A thenable that React's `use()` reads synchronously, standing in for route params.
const params = <T,>(value: T) =>
  ({ status: 'fulfilled', value, then: () => undefined }) as unknown as Promise<T>

type Screen = {
  name: string
  /** The page or dialog, rendered with fixtures. */
  render: () => ReactElement
  /** Query data to seed before rendering (keys match the page's useQuery). */
  seed?: [unknown[], unknown][]
  /** Accessible name of the one brand button, or undefined when the screen has no main action. */
  main?: RegExp
  /** Text that proves real content (not an empty state) rendered. */
  content: RegExp
}

const SCREENS: Screen[] = [
  {
    name: '/profile (edit form)',
    render: () => (
      <EditProfileForm
        user={fixtures.USER as unknown as Parameters<typeof EditProfileForm>[0]['user']}
      />
    ),
    main: /^save$/i,
    content: /Display Name/,
  },
  {
    name: '/posts/[id]/edit',
    render: () => <EditPostPage params={params({ id: '1' })} />,
    main: /^save changes$/i,
    content: /Edit Post/,
  },
  {
    name: '/admin/reports',
    render: () => <AdminReportsPage />,
    content: /Grace Reporter/,
  },
  {
    name: '/admin/users',
    render: () => <AdminUsersPage />,
    seed: [[['admin', 'users', '', 'ALL'], { users: [fixtures.USER_ROW] }]],
    content: /ada@example\.com/,
  },
  {
    name: '/requests',
    render: () => <RequestsPage />,
    content: /Need CS101 week 3 notes/,
  },
  {
    name: '/boards',
    render: () => <BoardsPage />,
    content: /Study room/,
  },
  {
    name: '/edit course (modal with outline)',
    render: () => (
      <AddCourseModal
        open
        code="CS101"
        name="Intro"
        yearLevel={1}
        onCodeChange={() => undefined}
        onNameChange={() => undefined}
        onYearChange={() => undefined}
        onClose={() => undefined}
        onSubmit={() => undefined}
        editMode
        courseId="c1"
      />
    ),
    main: /^save$/i,
    content: /Edit Course/,
  },
  { name: '/saved', render: () => <SavedPage />, content: /Saved/ },
  { name: '/notifications', render: () => <NotificationsPage />, content: /Notifications/ },
  { name: '/my-posts', render: () => <MyPostsPage />, content: /My Posts/ },
  { name: '/chat', render: () => <ChatPage />, content: /./ },
  {
    name: '/departments/[id]',
    render: () => <DepartmentPage params={params({ id: '1' })} />,
    content: /Department|Computer/,
  },
  {
    name: '/users/[id]',
    render: () => <UserProfilePage params={params({ id: '1' })} />,
    content: /Profile|Ada/,
  },
]

const renderScreen = (screen: Screen) => {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  })
  for (const [key, data] of screen.seed ?? []) client.setQueryData(key, data)
  return render(<QueryClientProvider client={client}>{screen.render()}</QueryClientProvider>)
}

afterEach(cleanup)

describe('admin and the remaining pages: brand actions', () => {
  it.each(SCREENS)('$name has at most one brand button, on its main action', (screen) => {
    renderScreen(screen)
    expect(document.body.textContent ?? '').toMatch(screen.content)
    const brand = document.body.querySelectorAll('[data-variant="brand"]')
    if (screen.main) {
      expect(brand).toHaveLength(1)
      const name = brand[0]?.textContent?.trim() ?? ''
      expect(name).toMatch(screen.main)
    } else {
      expect(brand).toHaveLength(0)
    }
  })
})
