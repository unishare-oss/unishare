import type { ReactElement } from 'react'
import { Suspense } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render } from '@testing-library/react'
import DecksPage from '@/app/(app)/(protected)/decks/page'
import NewDeckPage from '@/app/(app)/(protected)/decks/new/page'
import DeckDetailPage from '@/app/(app)/(protected)/decks/[id]/page'
import QuizzesPage from '@/app/(app)/quizzes/page'
import QuizPage from '@/app/(app)/quizzes/[id]/page'
import CalendarPage from '@/app/(app)/(protected)/calendar/page'

const mocks = vi.hoisted(() => {
  const router = { push: () => {}, replace: () => {}, refresh: () => {}, back: () => {} }
  // Generated hooks answer idle; `overrides` replaces `data` for the hooks a screen needs filled.
  const hookStub =
    (overrides: { data?: unknown } = {}) =>
    () => ({
      data: undefined,
      isLoading: false,
      isPending: false,
      isError: false,
      isFetching: false,
      mutate: () => {},
      mutateAsync: async () => undefined,
      refetch: async () => undefined,
      ...overrides,
    })
  const stubHooks =
    (overrides: Record<string, { data?: unknown }> = {}) =>
    (actual: Record<string, unknown>) =>
      Object.fromEntries(
        Object.entries(actual).map(([key, value]) => [
          key,
          key.startsWith('use') ? hookStub(overrides[key]) : value,
        ]),
      )
  const readyDeck = {
    id: 'd-1',
    status: 'READY',
    prompt: 'Cell division for week 3',
    title: 'Cell division',
    slideCount: 8,
    language: 'en',
    template: 'classic',
    tone: 'formal',
    shareToken: null,
    createdAt: '2026-11-01T00:00:00.000Z',
    completedAt: '2026-11-01T00:05:00.000Z',
    canEdit: false,
    editorUrl: null,
  }
  const quiz = {
    id: 'q-1',
    title: 'Cell basics',
    description: null,
    courseId: 'c-1',
    isPublished: true,
    questionsCount: 1,
    questions: [
      {
        id: 'qq-1',
        content: 'What is the powerhouse of the cell?',
        options: ['Nucleus', 'Mitochondrion'],
        correctAnswer: 1,
        difficulty: 'EASY',
        explanation: null,
      },
    ],
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  }
  return {
    router,
    readyDeck,
    quiz,
    stubHooks,
    auth: {
      user: { id: 'u-1', name: 'Ploy', role: 'ADMIN' },
      session: { user: { id: 'u-1', name: 'Ploy', role: 'ADMIN' } },
      isAuthenticated: true,
      isGuest: false,
      isLoading: false,
    },
  }
})

vi.mock('next/navigation', () => ({
  useRouter: () => mocks.router,
  useParams: () => ({ id: 'q-1' }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/contexts/auth-context', () => ({ useAuth: () => mocks.auth }))
vi.mock('@/hooks/use-my-departments', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useMyDepartments: () => ({ departments: [], isLoading: false, noUniversity: false }),
}))
vi.mock('@/src/lib/api/generated/decks/decks', async (importOriginal) =>
  mocks.stubHooks({ useDecksControllerGetDeck: { data: mocks.readyDeck } })(await importOriginal()),
)
vi.mock('@/src/lib/api/generated/quizzes/quizzes', async (importOriginal) =>
  mocks.stubHooks({ useQuizzesControllerGetQuiz: { data: mocks.quiz } })(await importOriginal()),
)
vi.mock('@/src/lib/api/generated/courses/courses', async (importOriginal) =>
  mocks.stubHooks()(await importOriginal()),
)
vi.mock('@/src/lib/api/generated/exams/exams', async (importOriginal) =>
  mocks.stubHooks()(await importOriginal()),
)

type BrandScreen = { name: string; render: () => ReactElement; main?: RegExp; content?: RegExp }

// `main` is the one brand button a screen may show; absent means the screen shows none.
const BRAND_SCREENS: BrandScreen[] = [
  { name: '/decks', render: () => <DecksPage />, main: /^New deck$/ },
  { name: '/decks/new', render: () => <NewDeckPage />, main: /^Generate deck$/ },
  {
    name: '/decks/[id]',
    render: () => <DeckDetailPage params={Promise.resolve({ id: 'd-1' })} />,
    content: /Cell division/,
  },
  { name: '/quizzes', render: () => <QuizzesPage /> },
  { name: '/quizzes/[id]', render: () => <QuizPage />, content: /powerhouse of the cell/ },
  { name: '/calendar', render: () => <CalendarPage />, main: /^Add Exam$/ },
]

async function renderScreen(element: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  let result: ReturnType<typeof render> | undefined
  await act(async () => {
    result = render(
      <QueryClientProvider client={client}>
        <Suspense fallback={null}>{element}</Suspense>
      </QueryClientProvider>,
    )
  })
  return result!
}

afterEach(cleanup)

describe('decks, quizzes and calendar brand buttons', () => {
  it.each(BRAND_SCREENS)(
    'each decks, quizzes and calendar page has at most one brand button, on its main action ($name)',
    async ({ render: renderPage, main, content }) => {
      const { container, findByText } = await renderScreen(renderPage())
      // Real content must be mounted before counting, so an empty or error state cannot pass.
      if (content) expect(await findByText(content)).toBeTruthy()
      const brands = container.querySelectorAll<HTMLElement>('[data-variant="brand"]')
      if (main) {
        expect(brands).toHaveLength(1)
        expect(brands[0]).toHaveAccessibleName(main)
      } else {
        expect(brands).toHaveLength(0)
      }
    },
  )
})
