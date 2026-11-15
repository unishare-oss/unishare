'use client'

import Link from 'next/link'
import { Flag } from 'lucide-react'
import { format, isSameDay } from 'date-fns'
import { Button } from '@/components/ui/button'
import { cn, pluralize } from '@/lib/utils'
import { usePostsControllerFindAll } from '@/src/lib/api/generated/posts/posts'
import { daysPhrase, examLabel, type ExamHero as ExamHeroData } from './exam-hero-data'
import { TodayGreeting } from './today-greeting'

const RING_DAYS = 14
const RING_R = 38
const RING_C = 2 * Math.PI * RING_R

export function ExamHero({
  hero,
  firstName,
  now,
}: {
  hero: ExamHeroData
  firstName: string
  now: Date
}) {
  const { next, daysLeft, then, moreCount, backToBack, days } = hero
  const code = next.course.code
  const starts = new Date(next.startsAt)
  const { data } = usePostsControllerFindAll(
    { courseId: next.course.id, limit: 1 },
    { query: { select: (response) => response.data } },
  )
  const newest = data?.items[0]
  const filled = daysLeft === 0 ? 1 : Math.min(daysLeft / RING_DAYS, 1)

  return (
    <section
      aria-labelledby="today-greeting"
      className="relative grid gap-5 overflow-hidden rounded-(--r-l) bg-hero p-[18px] text-on-hero [--noto-shadow:#000] min-[561px]:p-[22px]"
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-[18px] min-[561px]:grid-cols-[auto_minmax(0,1fr)_auto]">
        <TodayGreeting
          now={now}
          firstName={firstName}
          notoClassName="-mt-4 -mr-3.5 -mb-4 -ml-4 size-[100px] min-[561px]:-mt-7 min-[561px]:-mr-6 min-[561px]:-mb-7 min-[561px]:-ml-[26px] min-[561px]:size-[150px]"
        >
          <p className="mt-1 text-[15px] text-hero-muted">
            <b className="font-semibold text-on-hero">{examLabel(next)}</b>{' '}
            {daysLeft === 0 ? 'is today' : `is in ${daysPhrase(daysLeft)}`}
            {' · '}
            {format(starts, 'EEE d MMM, HH:mm')}
            {next.examRoom ? ` · ${next.examRoom}` : ''}
          </p>
          {then.length > 0 && (
            <div
              aria-label="Your next exams"
              className="mt-2.5 flex flex-wrap items-center gap-1.5"
            >
              <span className="mr-0.5 text-[13px] text-hero-muted">Then</span>
              {then.map((exam) => (
                <ThenChip key={exam.id}>
                  {examLabel(exam)}{' '}
                  <small className="font-medium text-hero-muted">
                    · {format(new Date(exam.startsAt), 'EEE')}
                  </small>
                </ThenChip>
              ))}
              {moreCount > 0 && <ThenChip>+{moreCount}</ThenChip>}
            </div>
          )}
          {backToBack && (
            <p className="mt-2 text-[13.5px] text-[#ffc58a]">
              {examLabel(backToBack[1])} is{' '}
              {isSameDay(new Date(backToBack[0].startsAt), new Date(backToBack[1].startsAt))
                ? 'the same day as'
                : 'the day after'}{' '}
              {examLabel(backToBack[0])}, so leave time for both.
            </p>
          )}
        </TodayGreeting>
        <div
          role="img"
          aria-label={`${daysPhrase(daysLeft)} to the exam`}
          className="relative hidden size-[92px] min-[561px]:block"
        >
          <svg viewBox="0 0 92 92" aria-hidden="true" className="size-full -rotate-90">
            <circle
              cx="46"
              cy="46"
              r={RING_R}
              fill="none"
              strokeWidth="9"
              className="stroke-hero-line"
            />
            <circle
              cx="46"
              cy="46"
              r={RING_R}
              fill="none"
              strokeWidth="9"
              strokeLinecap="round"
              className="stroke-brand"
              strokeDasharray={RING_C}
              strokeDashoffset={RING_C * (1 - filled)}
            />
          </svg>
          <div className="absolute inset-0 grid place-content-center text-center font-display text-[30px] leading-[0.9] font-extrabold tabular-nums">
            {daysLeft}
            <small className="font-sans text-[10px] font-semibold tracking-[0.08em] text-hero-muted uppercase">
              {pluralize(daysLeft, 'day')}
            </small>
          </div>
        </div>
      </div>

      <div aria-label="The next 7 days" className="grid grid-cols-7 gap-1 min-[561px]:gap-2">
        {days.map(({ date, exam, isToday }) => (
          <div
            key={date.toISOString()}
            title={
              exam ? `${examLabel(exam)}, ${format(new Date(exam.startsAt), 'HH:mm')}` : undefined
            }
            className={cn(
              'grid min-w-0 justify-items-center gap-1 rounded-(--r-s) px-0.5 pt-1.5 pb-[7px] text-center min-[561px]:px-1.5 min-[561px]:pt-2 min-[561px]:pb-[9px]',
              exam ? 'bg-brand/10' : isToday ? 'bg-brand/[0.16]' : 'bg-white/[0.06]',
              isToday && 'shadow-[inset_0_0_0_2px_var(--brand)]',
            )}
          >
            <span
              className={cn(
                'grid size-[26px] place-items-center rounded-full border-2',
                exam ? 'border-brand text-brand' : 'border-hero-line',
              )}
            >
              {exam ? (
                <Flag aria-hidden="true" className="size-3.5" strokeWidth={2.4} />
              ) : (
                <b className="text-xs font-bold tabular-nums">{format(date, 'd')}</b>
              )}
            </span>
            <small
              className={cn(
                'text-[10px] font-semibold whitespace-nowrap min-[561px]:text-[11px]',
                exam || isToday ? 'text-on-hero' : 'text-hero-muted',
              )}
            >
              {exam ? exam.course.code : isToday ? 'Today' : format(date, 'EEE')}
            </small>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="min-w-0 flex-[1_1_220px]">
          <small className="block text-xs text-hero-muted">Revise for {code}</small>
          {newest && (
            <b className="text-[15px] font-semibold">
              Newest:{' '}
              <Link
                href={`/posts/${newest.id}`}
                className="text-[#9cc0f7] underline underline-offset-[3px]"
              >
                {newest.title}
              </Link>
            </b>
          )}
        </div>
        <Link
          href="/calendar"
          className="py-1 text-sm font-semibold text-[#9cc0f7] hover:underline"
        >
          See calendar
        </Link>
        <Button asChild variant="brand" className="max-[560px]:w-full">
          <Link href={`/courses/${next.course.id}`}>Revise {code}</Link>
        </Button>
      </div>
    </section>
  )
}

function ThenChip({ children }: { children: React.ReactNode }) {
  return (
    <Link
      href="/calendar"
      className="rounded-full border border-hero-line bg-white/[0.06] px-2.5 py-[3px] text-[12.5px] font-semibold text-on-hero active:scale-[0.97] motion-safe:transition-[background-color,transform] motion-safe:duration-150 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-white/[0.12]"
    >
      {children}
    </Link>
  )
}
