'use client'

import { useState } from 'react'
import { addDays, differenceInCalendarDays, format } from 'date-fns'
import { useExamsControllerFindAll } from '@/src/lib/api/generated/exams/exams'
import type { ExamEntity } from '@/src/lib/api/generated/unishareAPI.schemas'
import { Skeleton } from '@/components/ui/skeleton'

const YEAR_AHEAD_DAYS = 365

function daysLeftLabel(startsAt: Date, now: Date): string {
  const days = differenceInCalendarDays(startsAt, now)
  if (days <= 0) return 'today'
  if (days === 1) return 'tomorrow'
  return `${days} days left`
}

/** A Google Calendar template link: opens the event pre-filled, nothing is stored. */
function addToCalendarHref(exam: ExamEntity): string {
  const start = new Date(exam.startsAt)
  const end = exam.endsAt ? new Date(exam.endsAt) : new Date(start.getTime() + 2 * 60 * 60 * 1000)
  const stamp = (date: Date) => date.toISOString().replace(/[-:]|\.\d{3}/g, '')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${exam.course.code} · ${exam.title}`,
    dates: `${stamp(start)}/${stamp(end)}`,
    location: exam.examRoom ?? '',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/** The next exam for this course, with its date, time, room and days left. */
export function ExamCard({ courseId, departmentId }: { courseId: string; departmentId: string }) {
  // Frozen at mount: a new date on each render would change the query key every time.
  const [range] = useState(() => {
    const now = new Date()
    return { now, from: now.toISOString(), to: addDays(now, YEAR_AHEAD_DAYS).toISOString() }
  })

  const { data: exams, isLoading } = useExamsControllerFindAll(
    { from: range.from, to: range.to, courseId, departmentId },
    { query: { select: (r) => r.data } },
  )

  if (isLoading) return <Skeleton className="h-40 w-full" />

  const next = [...(exams ?? [])]
    .filter((exam) => new Date(exam.startsAt) >= range.now)
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))[0]

  return (
    <section aria-labelledby="course-next-exam" className="space-y-3">
      <h2 id="course-next-exam" className="font-semibold text-ink">
        Next exam
      </h2>
      {!next ? (
        <div className="rounded-card border border-line bg-surface p-5">
          <p className="text-sm text-ink">No exam dates yet</p>
          <p className="mt-1 text-sm text-muted">Add your exam dates to see your countdown.</p>
        </div>
      ) : (
        <div className="space-y-3 rounded-card border border-line bg-surface p-5">
          <p className="font-mono text-xs uppercase tracking-widest text-muted">
            {daysLeftLabel(new Date(next.startsAt), range.now)}
          </p>
          <p className="font-semibold text-ink">{next.title}</p>
          <p className="text-sm text-muted">
            {format(new Date(next.startsAt), 'EEE d MMM, HH:mm')}
            {next.endsAt && ` – ${format(new Date(next.endsAt), 'HH:mm')}`}
          </p>
          <p className="text-sm text-muted">{next.examRoom ?? 'Room to be confirmed'}</p>
          <a
            href={addToCalendarHref(next)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm text-brand underline underline-offset-2"
          >
            Add to calendar
          </a>
        </div>
      )}
    </section>
  )
}
