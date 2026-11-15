import { readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { Suspense, type ComponentType } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const currentParams = vi.hoisted(() => ({ current: {} as Record<string, string> }))

vi.mock('@/src/lib/api/fetcher', () => ({ customFetch: () => new Promise(() => {}) }))

vi.mock('next/navigation', () => {
  const redirect = (url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`)
  }
  const notFound = () => {
    throw new Error('NEXT_NOT_FOUND')
  }
  return {
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
    useParams: () => currentParams.current,
    redirect,
    notFound,
  }
})

vi.mock('next/headers', () => ({
  headers: async () => new Headers({ host: 'localhost:3000' }),
  cookies: async () => ({ get: () => undefined, toString: () => '' }),
}))

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    session: { user: { id: 'u-1' } },
    user: {
      id: 'u-1',
      name: 'Student',
      email: 'student@example.com',
      role: 'STUDENT',
      image: null,
      department: null,
      university: null,
    },
    isLoading: false,
    isAuthenticated: true,
    isGuest: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@/contexts/chat-socket-context', async () => {
  const { createContext } = await import('react')
  return {
    ChatSocketContext: createContext({
      socketRef: { current: null },
      isConnected: false,
      joinRoom: () => {},
    }),
    ChatSocketProvider: ({ children }: { children: React.ReactNode }) => children,
  }
})

vi.mock('@/contexts/crypto-context', async () => {
  const { createContext } = await import('react')
  return {
    CryptoContext: createContext({
      loadRoomKey: async () => {},
      encrypt: async (_: string, c: string) => c,
      decrypt: async (_: string, c: string) => c,
      hasRoomKey: () => false,
      encryptRoomKeyForUser: async () => '',
      createEncryptedRoomKeys: async () => [],
      roomKeyVersion: 0,
      hasPrivateKey: false,
    }),
    CryptoProvider: ({ children }: { children: React.ReactNode }) => children,
  }
})

vi.mock('socket.io-client', () => ({
  io: () => ({ on: vi.fn(), off: vi.fn(), emit: vi.fn(), connect: vi.fn(), disconnect: vi.fn() }),
}))

vi.mock('@unishare-oss/unitheme/react', () => ({
  useTheme: () => ({
    theme: document.documentElement.classList.contains('dark')
      ? 'theme-catppuccin-mocha'
      : 'theme-unishare',
    setTheme: () => {},
  }),
}))

vi.mock('@excalidraw/excalidraw', () => ({ Excalidraw: () => null }))

const APP = __dirname

const ROUTE_MODULES = import.meta.glob('./**/page.tsx') as Record<
  string,
  () => Promise<{ default: ComponentType<Record<string, unknown>> }>
>

const ROUTE_PARAMS: Record<string, Record<string, string>> = {
  './(app)/(protected)/decks/[id]/page.tsx': { id: 'deck-1' },
  './(app)/(protected)/posts/[id]/edit/page.tsx': { id: 'post-1' },
  './(app)/(protected)/requests/[id]/page.tsx': { id: 'request-1' },
  './(app)/chat/[roomId]/page.tsx': { roomId: 'room-1' },
  './(app)/courses/[id]/page.tsx': { id: 'course-1' },
  './(app)/d/[token]/page.tsx': { token: 'token-1' },
  './(app)/departments/[id]/page.tsx': { id: 'department-1' },
  './(app)/lists/[id]/page.tsx': { id: 'list-1' },
  './(app)/posts/[id]/page.tsx': { id: 'post-1' },
  './(app)/quizzes/[id]/page.tsx': { id: 'quiz-1' },
  './(app)/quizzes/sessions/[sessionId]/page.tsx': { sessionId: 'session-1' },
  './(app)/s/[shortCode]/page.tsx': { shortCode: 'abc123' },
  './(app)/users/[id]/page.tsx': { id: 'user-1' },
  './canvas/[slug]/page.tsx': { slug: 'board-1' },
}

function scanPages(dir: string, out: string[] = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next') continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) scanPages(full, out)
    else if (name === 'page.tsx') out.push(`./${relative(APP, full).split(sep).join('/')}`)
  }
  return out
}

// Pages that redirect from an effect and legitimately render nothing.
const RENDERS_NOTHING = ['./auth/return/page.tsx']

const ROUTES = Object.keys(ROUTE_MODULES).sort()
const THEMES = {
  light: 'theme-unishare',
  dark: 'theme-catppuccin-mocha dark',
} as const

async function renderRoute(file: string, theme: keyof typeof THEMES) {
  document.documentElement.className = THEMES[theme]
  currentParams.current = ROUTE_PARAMS[file] ?? {}
  const Page = (await ROUTE_MODULES[file]()).default
  const props = {
    params: Promise.resolve(ROUTE_PARAMS[file] ?? {}),
    searchParams: Promise.resolve({}),
  }
  const errors: unknown[][] = []
  const spy = vi.spyOn(console, 'error').mockImplementation((...args) => void errors.push(args))
  try {
    let element: React.ReactNode
    let container: HTMLElement | undefined
    try {
      // An async server component is awaited; a client page is rendered as a component.
      const isAsync = Page.constructor.name === 'AsyncFunction'
      element = isAsync ? (
        await (Page as unknown as (p: typeof props) => Promise<React.ReactNode>)(props)
      ) : (
        <Page {...props} />
      )
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
      await act(async () => {
        container = render(
          <QueryClientProvider client={client}>
            <Suspense fallback={<p data-testid="suspense-fallback">loading</p>}>{element}</Suspense>
          </QueryClientProvider>,
        ).container
      })
    } catch (e) {
      // A redirect or not-found is a pass, but it must not have logged an error first.
      if (!isFrameworkSignal(e)) throw e
      container = undefined
    }
    if (container) {
      if (!RENDERS_NOTHING.includes(file)) {
        expect(container.innerHTML, `${file} (${theme}) rendered nothing`).not.toBe('')
      }
      expect(
        container.querySelector('[data-testid="suspense-fallback"]'),
        `${file} (${theme}) still suspended`,
      ).toBeNull()
    }
    expect(errors, `${file} (${theme}) console.error`).toEqual([])
  } finally {
    spy.mockRestore()
  }
}

function isFrameworkSignal(e: unknown) {
  return e instanceof Error && /NEXT_REDIRECT|NEXT_NOT_FOUND/.test(e.message)
}

beforeEach(() => {
  // The changelog lists GitHub releases; everything else answers 404 (so d/[token] and
  // s/[shortCode] reach notFound()).
  vi.stubGlobal('fetch', async (url: string) =>
    String(url).includes('github')
      ? new Response('[]', { status: 200 })
      : new Response('{}', { status: 404 }),
  )
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }))
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('every page', () => {
  it('finds every page', () => {
    expect(ROUTES).toEqual(scanPages(APP).sort())
    const dynamic = ROUTES.filter((file) => /\[[^\]]+\]/.test(file))
    expect(dynamic.filter((file) => !ROUTE_PARAMS[file])).toEqual([])
    expect(Object.keys(ROUTE_PARAMS).filter((file) => !ROUTE_MODULES[file])).toEqual([])
  })

  const cases = ROUTES.flatMap((file) =>
    (['light', 'dark'] as const).map((t) => [file, t] as const),
  )
  it.each(cases)(
    'renders %s in %s',
    async (file, theme) => {
      await renderRoute(file, theme)
    },
    30_000,
  )
})
