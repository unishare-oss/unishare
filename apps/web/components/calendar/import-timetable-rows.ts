import type { ReviewRow } from './import-timetable.types'

export function isResolved(row: ReviewRow): boolean {
  return row.matchStatus === 'matched' || row.matchStatus === 'picked'
}

export function needsCourseSearch(row: ReviewRow): boolean {
  return row.candidates.length === 0 && row.matchStatus !== 'matched'
}
