import type { ReviewRow } from './import-timetable.types'

export function isResolved(row: ReviewRow): boolean {
  return row.matchStatus === 'matched' || row.matchStatus === 'picked'
}

export function needsCourseSearch(row: ReviewRow): boolean {
  return row.candidates.length === 0 && row.matchStatus !== 'matched'
}

export function formatExamDateTime(value: string): string {
  const date = new Date(value)
  const day = date.toLocaleDateString(undefined, { day: '2-digit' })
  const month = date.toLocaleDateString(undefined, { month: 'short' })
  const time = date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  return `${day} ${month}, ${time}`
}
