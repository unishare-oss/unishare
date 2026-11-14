import { Suspense } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import PostDetailPage from './page'

let post: Record<string, unknown> | undefined
let auth = { isAuthenticated: true, user: { id: 'u1', name: 'Me', image: null } }

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn(), setQueryData: vi.fn() }),
}))
vi.mock('@/src/lib/api/generated/posts/posts', () => ({
  usePostsControllerFindOne: (
    _id: string,
    opts: { query: { select: (r: unknown) => unknown } },
  ) => ({
    data: post ? opts.query.select({ data: post }) : undefined,
  }),
  usePostsControllerRemove: () => ({ mutateAsync: vi.fn() }),
  usePostsControllerSummarize: () => ({ mutate: vi.fn(), isPending: false }),
  usePostsControllerReact: () => ({ mutate: vi.fn() }),
  usePostsControllerFindAll: () => ({ data: undefined }),
  getPostsControllerFindOneQueryKey: (id: string) => ['post', id],
}))
vi.mock('@/src/lib/api/generated/files/files', () => ({
  useFilesControllerRemove: () => ({ mutateAsync: vi.fn() }),
}))
vi.mock('@/contexts/auth-context', () => ({ useAuth: () => auth }))
vi.mock('@/hooks/use-academic-year', () => ({ useAcademicYear: () => null }))
vi.mock('@/components/posts/collection-picker', () => ({
  CollectionPicker: () => <button type="button">Save to collection</button>,
}))
vi.mock('@/components/ReportDialog', () => ({
  ReportDialog: () => <button type="button">Report post</button>,
}))
vi.mock('@/components/post-detail/post-files', () => ({
  PostFiles: () => <p>Note text and files</p>,
}))
vi.mock('@/components/post-detail/post-ai-chat', () => ({
  PostAiChat: () => <p>AI chat</p>,
}))
vi.mock('@/components/post-detail/comment-section', () => ({
  CommentSection: () => <p>Comments</p>,
}))

function basePost(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    title: 'Hash tables',
    type: 'NOTE',
    description: 'desc',
    summary: null,
    isOwner: false,
    status: 'APPROVED',
    shortCode: 'abc',
    createdAt: new Date().toISOString(),
    editedAt: null,
    views: 3,
    files: [],
    tags: [],
    reactionCounts: {},
    userReaction: null,
    course: { id: 'c1', code: 'CSC213', name: 'Data Structures' },
    author: { id: 'a1', name: 'Arthit K.', image: null, department: null, enrollmentYear: null },
    _count: { savedBy: 0, comments: 0 },
    ...overrides,
  }
}

// React's `use` reads an already-fulfilled thenable synchronously, so the page renders at once.
const params = Object.assign(Promise.resolve({ id: 'p1' }), {
  status: 'fulfilled',
  value: { id: 'p1' },
})

async function renderPage() {
  render(
    <Suspense>
      <PostDetailPage params={params} />
    </Suspense>,
  )
  await screen.findByRole('heading', { level: 1 })
}

beforeEach(() => {
  post = basePost()
  auth = { isAuthenticated: true, user: { id: 'u1', name: 'Me', image: null } }
})

describe('PostDetailPage', () => {
  it('renders the reading bar, breadcrumb and note paper', async () => {
    await renderPage()
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(nav).getByRole('link', { name: 'Today' })).toHaveAttribute('href', '/feed')
    expect(within(nav).getByRole('link', { name: /CSC213/ })).toHaveAttribute('href', '/courses/c1')
    expect(screen.getByRole('heading', { level: 1, name: 'Hash tables' })).toBeInTheDocument()
    expect(document.querySelector('article > [data-note-paper]')).toBeInTheDocument()
  })

  it('shows the AI summary first in the paper when the post has one', async () => {
    post = basePost({ summary: 'How hash tables work.' })
    await renderPage()
    const paper = document.querySelector('[data-note-paper]') as HTMLElement
    expect(paper.firstElementChild).toHaveTextContent('AI summary')
    expect(paper.firstElementChild).toHaveTextContent('How hash tables work.')
    expect(paper).toHaveTextContent('Note text and files')
  })

  it('hides the AI summary when the post has none', async () => {
    await renderPage()
    expect(screen.queryByText('AI summary')).not.toBeInTheDocument()
  })

  it('the action row has like, save and report', async () => {
    await renderPage()
    expect(screen.getByRole('button', { name: 'Helpful' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save to collection' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Report post' })).toBeInTheDocument()
  })

  it('shows edit and delete but no report for the owner', async () => {
    post = basePost({ isOwner: true })
    await renderPage()
    expect(screen.queryByRole('button', { name: 'Report post' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('shows no report button or AI chat for a guest', async () => {
    auth = { isAuthenticated: false, user: null as never }
    await renderPage()
    expect(screen.queryByRole('button', { name: 'Report post' })).not.toBeInTheDocument()
    expect(screen.queryByText('AI chat')).not.toBeInTheDocument()
  })

  it('has no Study card and no quiz list', async () => {
    await renderPage()
    for (const text of ['Study this note', 'Quiz me', 'Quizzes for this note', 'On this page']) {
      expect(screen.queryByText(text)).not.toBeInTheDocument()
    }
  })
})
