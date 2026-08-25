import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth } from 'date-fns'

export interface MonthGridDay {
  date: Date
  isOutside: boolean
}

/** Full 7-wide weeks covering `month`, including the leading/trailing days of adjacent months. */
export function buildMonthGrid(month: Date): MonthGridDay[] {
  const start = startOfWeek(startOfMonth(month))
  const end = endOfWeek(endOfMonth(month))

  const days: MonthGridDay[] = []
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
    days.push({ date: cursor, isOutside: !isSameMonth(cursor, month) })
  }
  return days
}

export const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
