import { Noto } from '@/components/noto/noto'
import { greetingFor } from './exam-hero-data'

/** Noto waving beside the page's h1. The hero and the no-exams card each place it in their own grid. */
export function TodayGreeting({
  now,
  firstName,
  notoClassName,
  children,
}: {
  now: Date
  /** Omit for a guest: the greeting has no name. */
  firstName?: string
  notoClassName: string
  children: React.ReactNode
}) {
  return (
    <>
      <Noto mood="wave" className={notoClassName} />
      <div className="min-w-0">
        <h1
          id="today-greeting"
          className="font-display text-[clamp(28px,4vw,38px)] leading-[1.05] font-extrabold tracking-[-0.02em]"
        >
          {greetingFor(now)}
          {firstName ? `, ${firstName}` : ''}
        </h1>
        {children}
      </div>
    </>
  )
}
