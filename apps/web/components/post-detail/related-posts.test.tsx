import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RelatedPosts } from '@/components/post-detail/related-posts'

type Select = { query: { select: (r: unknown) => unknown } }
let items: unknown[] = []
const calls: unknown[] = []
vi.mock('@/src/lib/api/generated/posts/posts', () => ({
  usePostsControllerFindAll: (params: unknown, opts: Select) => {
    calls.push(params)
    return { data: opts.query.select({ data: { items } }) }
  },
}))

function mockItems(next: unknown[]) {
  items = next
}

const post = (id: string, title: string, extra: Record<string, unknown> = {}) => ({
  id,
  title,
  type: 'NOTE',
  moduleNumber: 8,
  author: { name: 'Arthit K.' },
  ...extra,
})

describe('RelatedPosts', () => {
  beforeEach(() => {
    calls.length = 0
  })

  it('shows more posts from the same course', () => {
    mockItems([post('p1', 'Current note'), post('p2', 'Sorting'), post('p3', 'Graphs')])
    render(<RelatedPosts courseId="c1" courseCode="CSC213" currentPostId="p1" />)

    const params = calls[0] as object
    expect(params).toMatchObject({ courseId: 'c1' })
    expect(screen.getByRole('heading', { name: 'More from CSC213' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Sorting/ })).toHaveAttribute('href', '/posts/p2')
    expect(screen.getByRole('link', { name: /Graphs/ })).toHaveAttribute('href', '/posts/p3')
    expect(screen.queryByText('Current note')).not.toBeInTheDocument()
  })

  it('captions each post with type, module and author', () => {
    mockItems([
      post('p2', 'Sorting'),
      post('p3', 'Graphs', { type: 'OLD_QUESTION', moduleNumber: null, author: null }),
    ])
    render(<RelatedPosts courseId="c1" courseCode="CSC213" currentPostId="p1" />)

    expect(screen.getByText('Note · Module 8 · Arthit K.')).toBeInTheDocument()
    expect(screen.getByText('Past exam · A classmate')).toBeInTheDocument()
  })

  it('renders nothing without other posts', () => {
    mockItems([post('p1', 'Current note')])
    const { container } = render(
      <RelatedPosts courseId="c1" courseCode="CSC213" currentPostId="p1" />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
