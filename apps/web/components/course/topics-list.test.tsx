import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TopicsList } from './topics-list'
import type { CourseModule } from '@/lib/courses/course-page'

const posts = vi.hoisted(() => ({
  items: [] as unknown[],
  isError: false,
  refetch: vi.fn(),
}))

vi.mock('@/src/lib/api/generated/posts/posts', () => ({
  usePostsControllerFindAll: () => ({
    data: { items: posts.items, total: posts.items.length },
    isLoading: false,
    isError: posts.isError,
    refetch: posts.refetch,
  }),
}))

describe('TopicsList', () => {
  it('lists modules in order, with a share row for an empty module', () => {
    const modules: CourseModule[] = [
      { moduleNumber: 1, total: 3, newest: { title: 'Module 1: Intro' } as never },
      { moduleNumber: 2, total: 0 },
      { moduleNumber: 3, total: 1, newest: { title: 'Week 9: Graphs' } as never },
    ]
    render(<TopicsList courseId="c1" modules={modules} />)

    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toHaveTextContent('Module 1 · Intro · 3 notes')
    expect(buttons[1]).toHaveTextContent('Module 3 · Graphs · 1 note')
    expect(screen.getByText(/Module 2 · nobody has shared yet/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Share the first note' })).toHaveAttribute(
      'href',
      '/posts/new?courseId=c1',
    )
  })

  it('expands a row to list its posts with type tags and links', () => {
    posts.items = [{ id: 'p1', type: 'EXERCISE', title: 'Problem set 2' }]
    const modules: CourseModule[] = [
      { moduleNumber: 1, total: 1, newest: { title: 'Module 1: Intro' } as never },
    ]
    render(<TopicsList courseId="c1" modules={modules} />)

    const row = screen.getByRole('button', { name: /Module 1 · Intro/ })
    expect(row).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(row)

    expect(row).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('exercise')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Problem set 2/ })).toHaveAttribute('href', '/posts/p1')
  })

  it('shows an error with a retry in a module row whose request failed', () => {
    const onRetry = vi.fn()
    const modules: CourseModule[] = [
      { moduleNumber: 1, total: 0, failed: true },
      { moduleNumber: 2, total: 0 },
    ]
    render(<TopicsList courseId="c1" modules={modules} onRetry={onRetry} />)

    expect(screen.getByText(/Module 1 · couldn't load this module/)).toBeInTheDocument()
    expect(screen.queryByText(/Module 1 · nobody has shared yet/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledWith(1)
    expect(screen.getByText(/Module 2 · nobody has shared yet/)).toBeInTheDocument()
  })

  it('shows an error with retry when a topic row cannot load its posts', () => {
    posts.items = []
    posts.isError = true
    const modules: CourseModule[] = [
      { moduleNumber: 1, total: 1, newest: { title: 'Module 1: Intro' } as never },
    ]
    render(<TopicsList courseId="c1" modules={modules} />)

    fireEvent.click(screen.getByRole('button', { name: /Module 1 · Intro/ }))
    expect(screen.getByText("Couldn't load posts for this module.")).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(posts.refetch).toHaveBeenCalledTimes(1)
    posts.isError = false
  })
})
