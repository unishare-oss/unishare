import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { UpNextCard } from './up-next-card'
import type { CourseModule } from '@/lib/courses/course-page'

vi.mock('@/components/noto/noto', () => ({
  Noto: ({ mood }: { mood: string }) => <div data-testid="noto" data-mood={mood} />,
}))

const note = (id: string, title: string) => ({ id, title }) as never

describe('UpNextCard', () => {
  it('names the highest module that has notes and links to its newest note', () => {
    const modules: CourseModule[] = [
      { moduleNumber: 1, total: 3, newest: note('n1', 'Module 1: Intro') },
      { moduleNumber: 2, total: 4, newest: note('n2', 'Module 2: Hash tables') },
      { moduleNumber: 3, total: 0 },
    ]
    render(<UpNextCard courseId="c1" modules={modules} />)

    expect(screen.getByText('Module 2 · Hash tables · 4 notes')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open the note' })).toHaveAttribute('href', '/posts/n2')
    expect(screen.getByTestId('noto')).toHaveAttribute('data-mood', 'point')
  })

  it('shows the sleeping Noto and a share action when no module has notes', () => {
    const modules: CourseModule[] = [1, 2, 3].map((moduleNumber) => ({ moduleNumber, total: 0 }))
    render(<UpNextCard courseId="c1" modules={modules} />)

    expect(screen.getByTestId('noto')).toHaveAttribute('data-mood', 'sleep')
    expect(screen.getByRole('link', { name: 'Share the first note' })).toHaveAttribute(
      'href',
      '/posts/new?courseId=c1',
    )
  })

  it('shows a skeleton while the module counts load', () => {
    const { container } = render(<UpNextCard courseId="c1" />)
    expect(screen.queryByText('Up next')).not.toBeInTheDocument()
    expect(container.querySelector('[data-slot="skeleton"]')).not.toBeNull()
  })
})
