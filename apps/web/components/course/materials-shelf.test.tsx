import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PostEntity } from '@/src/lib/api/generated/unishareAPI.schemas'
import { MaterialsShelf } from '@/components/course/materials-shelf'

function post(id: string, type: PostEntity['type'], title: string, saves = 0) {
  return {
    id,
    type,
    title,
    isAnonymous: false,
    author: { id: 'u', name: 'Ploy S.' },
    createdAt: '2026-01-01T00:00:00.000Z',
    files: [],
    _count: { comments: 0, savedBy: saves },
  } as unknown as PostEntity
}

const posts = [
  post('p1', 'NOTE', 'Hash tables'),
  post('p2', 'OLD_QUESTION', 'Final 2025', 7),
  post('p3', 'OLD_QUESTION', 'Midterm 2024'),
  post('p4', 'EXERCISE', 'Heap drills'),
]
const counts = { notes: 1, exams: 2, exercises: 1 }

describe('MaterialsShelf', () => {
  it('type chips filter the grid and feature the newest old exam', async () => {
    render(<MaterialsShelf posts={posts} courseCode="CSC213" counts={counts} />)
    expect(screen.getByRole('link', { name: /Newest old exam/ })).toHaveTextContent('Final 2025')
    expect(screen.getByRole('button', { name: /All/ })).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(screen.getByRole('button', { name: /Notes/ }))
    expect(screen.getByRole('button', { name: /Notes/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByText(/Newest old exam/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Hash tables/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Heap drills/ })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Old exams/ }))
    expect(screen.getByRole('link', { name: /Newest old exam/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Midterm 2024/ })).toBeInTheDocument()
  })

  it('shows save counts as a number only, with reactions and age', () => {
    const withReactions = [
      { ...post('p9', 'NOTE', 'Graphs', 4), moduleNumber: 3, reactionCounts: { LIKE: 2, LOVE: 3 } },
    ] as unknown as PostEntity[]
    render(<MaterialsShelf posts={withReactions} courseCode="CSC213" counts={counts} />)
    expect(screen.getByText('4 saves')).toBeInTheDocument()
    expect(screen.getByText('♥ 5')).toBeInTheDocument()
    expect(screen.getByText('Module 3', { selector: 'span.font-mono' })).toBeInTheDocument()
    expect(screen.getByText(/\d+d ago|Today/)).toBeInTheDocument()
    expect(screen.queryByText('Ploy S.', { selector: 'b' })).not.toBeInTheDocument()
  })

  it('names the page art like the demo', () => {
    render(<MaterialsShelf posts={posts} courseCode="CSC213" counts={counts} />)
    expect(screen.getByText('CSC213 · Note')).toBeInTheDocument()
    expect(screen.getAllByText('CSC213 · Midterm 2024').length).toBeGreaterThan(0)
  })
})
