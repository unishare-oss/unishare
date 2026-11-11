'use client'

import { useEffect, useState } from 'react'
import { RelatedPosts } from '@/components/post-detail/related-posts'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Heading = { id: string; text: string; level: number }

export function NoteRail({
  courseId,
  courseName,
  postId,
}: {
  courseId: string
  courseName: string
  postId: string
}) {
  const [headings, setHeadings] = useState<Heading[]>([])
  const [active, setActive] = useState('')
  const [questions, setQuestions] = useState(5)

  useEffect(() => {
    const paper = document.querySelector('[data-note-paper]')
    if (!paper) return
    const updateHeadings = () => {
      const items = Array.from(paper.querySelectorAll('.markdown h1,.markdown h2,.markdown h3'))
      const found = items
        .map((heading, index) => {
          const text = heading.textContent?.trim() ?? ''
          const slug =
            text
              .toLowerCase()
              .normalize('NFKD')
              .replace(/[^\w\s-]/g, '')
              .trim()
              .replace(/\s+/g, '-') || `section-${index + 1}`
          const id = `note-${slug}-${index + 1}`
          heading.id = id
          return { id, text, level: Number(heading.tagName.slice(1)) }
        })
        .filter((heading) => heading.text)
      setHeadings(found)
      setActive((current) =>
        found.some(({ id }) => id === current) ? current : (found[0]?.id ?? ''),
      )
    }
    updateHeadings()
    const observer = new MutationObserver(updateHeadings)
    observer.observe(paper, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [postId])

  useEffect(() => {
    if (headings.length < 2) return
    const updateActive = () => {
      const current = [...headings].reverse().find(({ id }) => {
        const element = document.getElementById(id)
        return element && element.getBoundingClientRect().top <= 140
      })
      setActive(current?.id ?? headings[0].id)
    }
    window.addEventListener('scroll', updateActive, { passive: true })
    updateActive()
    return () => window.removeEventListener('scroll', updateActive)
  }, [headings])

  return (
    <div className="space-y-5">
      <section className="rounded-card border border-line bg-surface p-5">
        <h2 className="font-semibold text-ink">Study this note</h2>
        <p className="mt-1 text-sm text-muted">Choose a quiz length</p>
        <div
          className="mt-3 grid grid-cols-4 gap-2"
          role="group"
          aria-label="Quiz length in questions"
        >
          {[5, 10, 15, 20].map((value) => (
            <Button
              key={value}
              variant="quiet"
              size="sm"
              type="button"
              onClick={() => setQuestions(value)}
              aria-label={`${value} questions`}
              aria-pressed={questions === value}
              className={cn('px-2', questions === value && 'border-brand bg-brand-soft text-ink')}
            >
              {value}
            </Button>
          ))}
        </div>
        <Button
          variant="brand"
          type="button"
          disabled
          aria-describedby="note-quiz-coming-soon"
          className="mt-3 w-full"
        >
          Quiz me
        </Button>
        <p id="note-quiz-coming-soon" className="mt-2 text-center text-xs text-muted">
          Quizzes on notes are coming soon
        </p>
      </section>

      {headings.length >= 2 && (
        <nav aria-label="On this page" className="rounded-card border border-line bg-surface p-5">
          <h2 className="mb-3 font-semibold text-ink">On this page</h2>
          <ul className="space-y-2">
            {headings.map((heading) => (
              <li key={heading.id} className={heading.level > 2 ? 'pl-3' : ''}>
                <a
                  href={`#${heading.id}`}
                  aria-current={active === heading.id ? 'location' : undefined}
                  className={`text-sm ${active === heading.id ? 'font-medium text-brand' : 'text-muted hover:text-ink'}`}
                >
                  {heading.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <RelatedPosts courseId={courseId} courseName={courseName} currentPostId={postId} />
    </div>
  )
}
