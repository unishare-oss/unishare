import { addDays, differenceInCalendarDays, isSameDay } from 'date-fns'
import { pluralize } from '@/lib/utils'
import type { ExamEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

export interface ExamHero {
  next: ExamEntity
  /** Calendar days from today to the exam day. */
  daysLeft: number
  /** The next exams after `next`, at most two. */
  then: ExamEntity[]
  moreCount: number
  /** `next` and the exam after it, when they are a day or less apart. */
  backToBack: [ExamEntity, ExamEntity] | null
  /** The next seven days, today first. */
  days: { date: Date; exam: ExamEntity | null; isToday: boolean }[]
}

/** The exams that have not started yet, soonest first. */
export function upcomingExams(exams: ExamEntity[], now: Date): ExamEntity[] {
  return exams
    .filter((exam) => new Date(exam.startsAt) >= now)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
}

/** "3 days" or "1 day". */
export function daysPhrase(days: number): string {
  return `${days} ${pluralize(days, 'day')}`
}

export function getExamHero(exams: ExamEntity[], now: Date): ExamHero | null {
  const upcoming = upcomingExams(exams, now)
  const [next, ...later] = upcoming
  if (!next) return null

  const second = later[0]
  const close =
    second && differenceInCalendarDays(new Date(second.startsAt), new Date(next.startsAt)) <= 1
  return {
    next,
    daysLeft: differenceInCalendarDays(new Date(next.startsAt), now),
    then: later.slice(0, 2),
    moreCount: Math.max(0, later.length - 2),
    backToBack: close ? [next, second] : null,
    days: Array.from({ length: 7 }, (_, i) => {
      const date = addDays(now, i)
      return {
        date,
        exam: upcoming.find((exam) => isSameDay(new Date(exam.startsAt), date)) ?? null,
        isToday: i === 0,
      }
    }),
  }
}

/** "CSC213 Final", or just the title when it already starts with the course code. */
export function examLabel(exam: ExamEntity): string {
  const code = exam.course.code
  return exam.title.toLowerCase().startsWith(code.toLowerCase())
    ? exam.title
    : `${code} ${exam.title}`
}

export function greetingFor(now: Date): string {
  const hour = now.getHours()
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
}
