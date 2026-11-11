import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useFeedStore } from '@/lib/store'
import FeedPage from './page'

const mocks = vi.hoisted(() => ({
  search: '',
  replace: vi.fn(),
  postsFindAll: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(mocks.search),
}))
vi.mock('@tanstack/react-query', () => ({
  keepPreviousData: undefined,
  useQuery: () => ({ data: undefined, isLoading: false }),
}))
vi.mock('@/src/lib/api/generated/posts/posts', () => ({
  usePostsControllerFindAll: (params: unknown) => {
    mocks.postsFindAll(params)
    return { data: undefined, isLoading: false }
  },
}))
vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    user: { department: { id: 'd1' }, yearLevel: 2 },
  }),
}))
vi.mock('@/components/feed/feed-header', () => ({
  FeedHeader: (props: {
    onSearchChange: (value: string) => void
    onTagSelect: (tag: string) => void
  }) => (
    <div>
      <button onClick={() => props.onSearchChange('pasta')}>search pasta</button>
      <button onClick={() => props.onTagSelect('exam')}>pick exam tag</button>
    </div>
  ),
}))
vi.mock('@/components/feed/filter-strip', () => ({ FilterStrip: () => null }))
vi.mock('@/components/feed/post-feed', () => ({ PostFeed: () => null }))

describe('feed filters', () => {
  beforeEach(() => {
    mocks.search = ''
    mocks.replace.mockClear()
    mocks.postsFindAll.mockClear()
    useFeedStore.setState({
      selectedDeptId: 'd1',
      selectedYear: 2,
      hasSelectedYear: true,
      selectedCourseId: 'c1',
      selectedModuleNumber: 3,
    })
  })

  it('Today keeps the student department, year and course filters', () => {
    render(<FeedPage />)
    expect(mocks.postsFindAll).toHaveBeenLastCalledWith(
      expect.objectContaining({
        departmentId: 'd1',
        yearLevel: 2,
        courseId: 'c1',
        moduleNumber: 3,
      }),
    )
  })

  it('clearing the search returns to plain /feed', async () => {
    mocks.search = 'q=old'
    render(<FeedPage />)
    await userEvent.click(screen.getByRole('button', { name: 'search pasta' }))
    expect(mocks.replace).toHaveBeenLastCalledWith('/feed?q=pasta', { scroll: false })
  })
})
