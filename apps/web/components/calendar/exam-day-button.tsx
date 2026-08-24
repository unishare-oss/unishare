'use client'

import type { ComponentProps } from 'react'
import type { DayButton } from 'react-day-picker'
import { CalendarDayButton } from '@/components/ui/calendar'

/** Same as the default DayButton, plus a dot under any day that has at least one exam. */
export function ExamDayButton(props: ComponentProps<typeof DayButton>) {
  const { modifiers } = props
  return (
    <div className="relative flex size-full flex-col items-center">
      <CalendarDayButton {...props} />
      {modifiers.hasExam && <span className="absolute bottom-0.5 size-1 rounded-full bg-red-400" />}
    </div>
  )
}
