import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MaterialsShelf } from './materials-shelf'

const shelf = vi.hoisted(() => ({
  items: [] as unknown[],
  hasNextPage: false,
  isError: false,
  fetchNextPage: null as unknown as () => void,
  lastParams: undefined as unknown,
}))

vi.mock('@/src/lib/api/generated/posts/posts', () => ({
  usePostsControllerFindAllInfinite: (params: unknown) => {
    shelf.lastParams = params
    return {
      data: shelf.items,
      hasNextPage: shelf.hasNextPage,
      fetchNextPage: shelf.fetchNextPage,
      isFetchingNextPage: false,
      isError: shelf.isError,
      isLoading: false,
    }
  },
}))

const post = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  type: 'NOTE',
  title: `Post ${id}`,
  moduleNumber: 2,
  isAnonymous: false,
  author: { name: 'Ploy' },
  createdAt: '2026-11-01T10:00:00.000Z',
  reactionCounts: { HELPFUL: 2, LOVE: 1 },
  _count: { comments: 0, savedBy: 120 },
  ...overrides,
})

const counts = { all: 12, notes: 8, oldExams: 3, exercises: 1 }

describe('MaterialsShelf', () => {
  beforeEach(() => {
    shelf.items = []
    shelf.hasNextPage = false
    shelf.isError = false
    shelf.fetchNextPage = vi.fn()
  })

  it('shows chips with counts and the save count as a number only', () => {
    shelf.items = [post('a')]
    render(<MaterialsShelf courseId="c1" counts={counts} />)

    expect(screen.getByRole('button', { name: /All 12/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Notes 8/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Old exams 3/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Exercises 1/ })).toBeInTheDocument()

    const card = screen.getByRole('link', { name: /Post a/ })
    expect(within(card).getByLabelText('Saved by 120')).toHaveTextContent('120')
    expect(within(card).getByLabelText('3 reactions')).toBeInTheDocument()
    expect(within(card).getByText('Ploy · 1 Nov')).toBeInTheDocument()
    expect(screen.queryByText(/saved by/i)).toBeNull()
  })

  it('features the newest old exam and leaves it out of the grid', () => {
    shelf.items = [post('exam', { type: 'OLD_QUESTION' }), post('n1')]
    const featured = post('exam', { type: 'OLD_QUESTION', title: 'Midterm 2025' }) as never
    render(<MaterialsShelf courseId="c1" counts={counts} featured={featured} />)

    expect(screen.getByText('Latest old exam')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Midterm 2025/ })).toHaveLength(1)
    expect(screen.queryAllByRole('link', { name: /Post exam/ })).toHaveLength(0)
  })

  it('shows six cards, then Show all reveals the rest', () => {
    shelf.items = Array.from({ length: 7 }, (_, i) => post(`p${i}`))
    render(<MaterialsShelf courseId="c1" counts={counts} />)

    expect(screen.getAllByRole('link')).toHaveLength(6)
    fireEvent.click(screen.getByRole('button', { name: 'Show all' }))
    expect(screen.getAllByRole('link')).toHaveLength(7)
    expect(screen.queryByRole('button', { name: 'Show all' })).toBeNull()
  })

  it('filters by type and requests newest first with that type', () => {
    render(<MaterialsShelf courseId="c1" counts={counts} />)

    fireEvent.click(screen.getByRole('button', { name: /Old exams/ }))

    expect(shelf.lastParams).toMatchObject({ courseId: 'c1', type: 'OLD_QUESTION' })
    expect(screen.getByRole('button', { name: /Old exams/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('shows the featured old exam only under All and Old exams', () => {
    shelf.items = [post('n1')]
    const featured = post('exam', { type: 'OLD_QUESTION', title: 'Midterm 2025' }) as never
    render(<MaterialsShelf courseId="c1" counts={counts} featured={featured} />)

    expect(screen.getByText('Latest old exam')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Notes/ }))
    expect(screen.queryByText('Latest old exam')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /Exercises/ }))
    expect(screen.queryByText('Latest old exam')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /Old exams/ }))
    expect(screen.getByText('Latest old exam')).toBeInTheDocument()
  })

  it('does not say "Nothing here yet" under Old exams when the featured exam is the only one', () => {
    shelf.items = [post('exam', { type: 'OLD_QUESTION' })]
    const featured = post('exam', { type: 'OLD_QUESTION', title: 'Midterm 2025' }) as never
    render(<MaterialsShelf courseId="c1" counts={counts} featured={featured} />)

    fireEvent.click(screen.getByRole('button', { name: /Old exams/ }))
    expect(screen.getByText('Latest old exam')).toBeInTheDocument()
    expect(screen.queryByText('Nothing here yet.')).toBeNull()
  })

  it('stops fetching more pages after an error and retries only on Try again', () => {
    shelf.items = Array.from({ length: 7 }, (_, i) => post(`p${i}`))
    shelf.hasNextPage = true
    shelf.isError = true
    const fetchNextPage = vi.fn()
    shelf.fetchNextPage = fetchNextPage
    render(<MaterialsShelf courseId="c1" counts={counts} />)

    fireEvent.click(screen.getByRole('button', { name: 'Show all' }))
    expect(fetchNextPage).not.toHaveBeenCalled()
    expect(screen.getByText("Couldn't load more materials.")).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(fetchNextPage).toHaveBeenCalledTimes(1)
  })
})
