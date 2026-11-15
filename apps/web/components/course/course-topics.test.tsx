import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PostEntity } from '@/src/lib/api/generated/unishareAPI.schemas'
import { groupByModule } from '@/lib/courses/course-page'
import { CourseTopics } from '@/components/course/course-topics'

const post = (id: string, moduleNumber: number) =>
  ({ id, title: `Title ${id}`, moduleNumber }) as PostEntity

describe('CourseTopics', () => {
  it('renders a row per module', async () => {
    const modules = groupByModule([post('a', 2), post('b', 2), post('c', 5)])
    render(
      <CourseTopics courseId="c-1" modules={modules} canShare isError={false} onRetry={() => {}} />,
    )
    const row = screen.getByRole('button', { name: /Module 2\s*Title a/ })
    expect(row).toHaveTextContent('2 posts')
    expect(screen.getByRole('button', { name: /Module 5\s*Title c/ })).toBeInTheDocument()
    await userEvent.click(row)
    expect(screen.getByRole('link', { name: 'Title b' })).toHaveAttribute('href', '/posts/b')
  })

  it('keeps the links of a closed module out of reach', async () => {
    const modules = groupByModule([post('a', 2), post('b', 2)])
    render(
      <CourseTopics courseId="c-1" modules={modules} canShare isError={false} onRetry={() => {}} />,
    )
    const row = screen.getByRole('button', { name: /Module 2/ })
    const panel = document.getElementById(row.getAttribute('aria-controls')!)!
    expect(panel).toHaveAttribute('inert')
    await userEvent.click(row)
    expect(panel).not.toHaveAttribute('inert')
  })

  it('hides the share link from guests', () => {
    render(
      <CourseTopics
        courseId="c-1"
        modules={[]}
        canShare={false}
        isError={false}
        onRetry={() => {}}
      />,
    )
    expect(screen.getByText(/Nobody has shared yet/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Share the first note' })).not.toBeInTheDocument()
  })

  it('links to share when nobody has shared yet', () => {
    render(<CourseTopics courseId="c-1" modules={[]} canShare isError={false} onRetry={() => {}} />)
    expect(screen.getByText(/Nobody has shared yet/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Share the first note' })).toHaveAttribute(
      'href',
      '/posts/new?courseId=c-1',
    )
  })
})
