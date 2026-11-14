'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { differenceInCalendarDays, format } from 'date-fns'
import { useAuth } from '@/contexts/auth-context'
import { useExamsControllerFindAll } from '@/src/lib/api/generated/exams/exams'

const WINDOW_DAYS = 365
const CARD = 'grid min-w-0 gap-3.5 rounded-(--r) border-2 border-line bg-surface p-[18px]'
const EYEBROW = 'font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase'

interface CourseExamCardProps {
  courseId: string
  /** The course's own department: the API otherwise filters to the viewer's. */
  departmentId: string
}

/** The course's next exam, or "No upcoming exam", for members only. Guests make no request. */
export function CourseExamCard({ courseId, departmentId }: CourseExamCardProps) {
  const headingId = useId()
  const { isAuthenticated } = useAuth()
  const [range] = useState(() => {
    const now = new Date()
    return {
      now,
      from: now.toISOString(),
      to: new Date(now.getTime() + WINDOW_DAYS * 86_400_000).toISOString(),
    }
  })
  const { data: exams } = useExamsControllerFindAll(
    { courseId, departmentId, from: range.from, to: range.to },
    { query: { enabled: isAuthenticated, select: (response) => response.data } },
  )
  if (!isAuthenticated) return null

  // A placeholder while loading keeps the rail (and the main column's width) from jumping.
  if (!exams) {
    return (
      <section
        aria-label="Loading the next exam"
        aria-busy="true"
        className={`${CARD} h-[188px] animate-pulse motion-reduce:animate-none`}
      />
    )
  }

  const next = exams
    .filter((exam) => new Date(exam.startsAt) > range.now)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0]

  if (!next) {
    return (
      <section aria-labelledby={headingId} className={CARD}>
        <span id={headingId} className={EYEBROW}>
          Exams
        </span>
        <span className="text-[17px] font-semibold">No upcoming exam</span>
        <p className="-mt-1.5 text-sm text-muted-foreground">
          Nothing is on the calendar for this course yet.
        </p>
        <Button size="sm" asChild className="justify-self-start">
          <Link href="/calendar">Open calendar</Link>
        </Button>
      </section>
    )
  }

  const starts = new Date(next.startsAt)
  const days = differenceInCalendarDays(starts, range.now)
  const time = next.endsAt
    ? `${format(starts, 'HH:mm')}–${format(new Date(next.endsAt), 'HH:mm')}`
    : format(starts, 'HH:mm')
  const where = [time, next.examRoom ? `Room ${next.examRoom}` : null].filter(Boolean).join(' · ')

  return (
    <section aria-labelledby={headingId} className={CARD}>
      <span id={headingId} className={EYEBROW}>
        {next.title}
      </span>
      <span className="font-display text-[30px] leading-none font-extrabold tracking-[-0.01em]">
        {format(starts, 'EEE d MMM')}
      </span>
      <p className="-mt-1.5 text-sm text-muted-foreground">{where}</p>
      <span className="justify-self-start rounded-full bg-brand-soft px-2.5 py-[3px] text-xs font-semibold text-brand-edge">
        {days === 0 ? 'Today' : `${days} ${days === 1 ? 'day' : 'days'} left`}
      </span>
      <Button size="sm" asChild className="justify-self-start">
        <Link href="/calendar">Open calendar</Link>
      </Button>
    </section>
  )
}
