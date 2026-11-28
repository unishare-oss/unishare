'use client'

import { addDays, startOfDay } from 'date-fns'
import { useAuth } from '@/contexts/auth-context'
import { useExamsControllerFindAll } from '@/src/lib/api/generated/exams/exams'
import { ExamHero } from './exam-hero'
import { getExamHero } from './exam-hero-data'
import { TodayGreeting } from './today-greeting'

const WINDOW_DAYS = 60

/** The page's top: the exam hero for a member with upcoming exams, otherwise Noto's line. */
export function TodayTop() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const hasDepartment = isAuthenticated && !!user?.department
  const now = new Date()
  // The query range changes once a day: a range built from `now` would refetch on every render.
  const dayStart = startOfDay(now)
  const from = dayStart.toISOString()
  const to = addDays(dayStart, WINDOW_DAYS).toISOString()
  const { data: exams, isLoading } = useExamsControllerFindAll(
    { from, to, mine: true },
    { query: { enabled: hasDepartment, select: (response) => response.data } },
  )

  if (authLoading || (hasDepartment && isLoading)) return null

  const firstName = user?.name?.split(' ')[0] ?? 'there'
  const hero = hasDepartment ? getExamHero(exams ?? [], now) : null
  if (hero) return <ExamHero hero={hero} firstName={firstName} now={now} />

  const line = !isAuthenticated
    ? 'Sign in to see your exams here. Meanwhile, this is what students are sharing.'
    : !hasDepartment
      ? 'Add your department to your profile to see your exams here.'
      : 'No exams on your calendar right now. A quiet stretch is a good time to tidy up your notes.'
  return (
    <section
      aria-labelledby="today-greeting"
      className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 rounded-(--r-l) border-2 border-line bg-surface p-[18px] min-[561px]:gap-x-[18px] min-[561px]:gap-y-1.5 min-[561px]:p-[22px]"
    >
      <TodayGreeting
        now={now}
        firstName={isAuthenticated ? firstName : undefined}
        notoClassName="-mt-3 -mr-2.5 -mb-3.5 -ml-3 size-[92px] min-[561px]:-mt-5 min-[561px]:-mr-3.5 min-[561px]:-mb-[22px] min-[561px]:-ml-[18px] min-[561px]:size-32"
      >
        <p
          role="status"
          className="relative mt-2 inline-block max-w-[46ch] rounded-[16px_16px_16px_4px] bg-surface-2 px-3.5 py-2.5 text-[15px] leading-[1.45]"
        >
          {line}
        </p>
      </TodayGreeting>
    </section>
  )
}
