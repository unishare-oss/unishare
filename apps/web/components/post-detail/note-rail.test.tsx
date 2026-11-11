import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NoteRail } from './note-rail'

vi.mock('@/src/lib/api/generated/posts/posts', () => ({
  usePostsControllerFindAll: () => ({ data: { items: [] } }),
}))

function renderRail(headings: string[]) {
  return render(
    <>
      <article data-note-paper>
        <div className="markdown">
          {headings.map((heading) => (
            <h2 key={heading}>{heading}</h2>
          ))}
        </div>
      </article>
      <NoteRail courseId="course-id" courseName="Data Structures" postId="post-id" />
    </>,
  )
}

describe('NoteRail table of contents', () => {
  it('omits the table of contents for fewer than two Markdown headings', () => {
    renderRail(['One section'])

    expect(screen.queryByRole('navigation', { name: 'On this page' })).not.toBeInTheDocument()
  })

  it('shows headings with scroll spy when the note has at least two headings', () => {
    renderRail(['First section', 'Second section'])

    expect(screen.getByRole('navigation', { name: 'On this page' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'First section' })).toHaveAttribute(
      'href',
      '#note-first-section-1',
    )
    expect(screen.getByRole('link', { name: 'Second section' })).toHaveAttribute(
      'href',
      '#note-second-section-2',
    )
  })

  it('moves the active location as the reader scrolls and preserves it after paper mutations', async () => {
    const { container } = renderRail(['First section', 'Second section', 'Third section'])
    const paper = container.querySelector('[data-note-paper]')
    const [first, second, third] = Array.from(paper!.querySelectorAll('.markdown h2'))
    const firstPosition = vi
      .spyOn(first, 'getBoundingClientRect')
      .mockReturnValue({ top: 100 } as DOMRect)
    const secondPosition = vi
      .spyOn(second, 'getBoundingClientRect')
      .mockReturnValue({ top: 500 } as DOMRect)
    vi.spyOn(third, 'getBoundingClientRect').mockReturnValue({ top: 900 } as DOMRect)

    fireEvent.scroll(window)
    const firstLink = screen.getByRole('link', { name: 'First section' })
    const secondLink = screen.getByRole('link', { name: 'Second section' })
    expect(firstLink).toHaveAttribute('aria-current', 'location')
    expect(secondLink).not.toHaveAttribute('aria-current', 'location')

    firstPosition.mockReturnValue({ top: -100 } as DOMRect)
    secondPosition.mockReturnValue({ top: 80 } as DOMRect)
    fireEvent.scroll(window)
    expect(secondLink).toHaveAttribute('aria-current', 'location')

    act(() => paper?.append(document.createElement('span')))
    await waitFor(() => expect(secondLink).toHaveAttribute('aria-current', 'location'))
  })
})
