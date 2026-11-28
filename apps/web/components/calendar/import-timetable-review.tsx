import { Clock3, TriangleAlert, X } from 'lucide-react'
import { useCoursesControllerFindAll } from '@/src/lib/api/generated/courses/courses'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SearchSelect, type SearchSelectOption } from '@/components/ui/search-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatExamDateTime, isResolved, needsCourseSearch } from './import-timetable-rows'
import type { ReviewRow } from './import-timetable.types'

const STATUS_BADGE: Record<ReviewRow['matchStatus'], { label: string; className: string }> = {
  matched: { label: 'Matched', className: 'bg-ok-soft text-ok' },
  ambiguous: { label: 'Pick a course', className: 'bg-warn-soft text-warn' },
  unmatched: { label: 'Course not found', className: 'bg-bad-soft text-bad' },
  picked: { label: 'Picked', className: 'bg-ok-soft text-ok' },
}

interface ImportTimetableReviewProps {
  rows: ReviewRow[]
  timezone: string
  onUpdate: (rowId: number, update: Partial<ReviewRow>) => void
  onRemove: (rowId: number) => void
}

function StatusBadge({ row }: { row: ReviewRow }) {
  const { label, className } = STATUS_BADGE[row.matchStatus]

  return (
    <Badge className={`border-transparent ${className}`} variant="outline">
      {label}
    </Badge>
  )
}

function movedExamDate(row: ReviewRow): string | null {
  const proposedStart = new Date(`${row.date}T${row.startsAt}:00`).getTime()
  const existingExams = row.existingExams
  if (existingExams.some((exam) => new Date(exam.startsAt).getTime() === proposedStart)) {
    return null
  }

  const title = row.title.trim().toLowerCase()
  const moved = existingExams.find((exam) => exam.title.trim().toLowerCase() === title)
  if (!moved) return null

  return formatExamDateTime(moved.startsAt)
}

function MovedExamWarning({ row }: { row: ReviewRow }) {
  const date = movedExamDate(row)
  if (!date) return null

  return (
    <div className="mt-1 flex items-start gap-2 text-[12.5px] leading-snug text-warn">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        Already has an exam on <strong>{date}</strong>. Moved? Delete the old one after publishing.
      </span>
    </div>
  )
}

function CourseChoice({
  row,
  rowNumber,
  courseOptions,
  onSelect,
}: {
  row: ReviewRow
  rowNumber: number
  courseOptions: SearchSelectOption[]
  onSelect: (courseId: string) => void
}) {
  if (needsCourseSearch(row)) {
    return (
      <SearchSelect
        options={courseOptions}
        value={row.courseId ?? ''}
        onChange={onSelect}
        placeholder="Search for a course"
        ariaLabel={`Course for row ${rowNumber}`}
      />
    )
  }

  if (row.candidates.length > 0) {
    return (
      <Select value={row.courseId ?? undefined} onValueChange={onSelect}>
        <SelectTrigger
          className="w-full min-w-0"
          size="sm"
          aria-label={`Course for row ${rowNumber}`}
        >
          <SelectValue placeholder="Pick a course" />
        </SelectTrigger>
        <SelectContent>
          {row.candidates.map((course) => (
            <SelectItem key={course.id} value={course.id}>
              {course.code} — {course.name} ({course.departmentName})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return null
}

export function ImportTimetableReview({
  rows,
  timezone,
  onUpdate,
  onRemove,
}: ImportTimetableReviewProps) {
  const matchedCount = rows.filter(isResolved).length
  const { data: coursesData } = useCoursesControllerFindAll(
    { limit: 100 },
    { query: { select: (response) => response.data, enabled: rows.some(needsCourseSearch) } },
  )
  const courseOptions = (coursesData?.items ?? []).map((course) => ({
    value: course.id,
    label: `${course.code} — ${course.name}`,
  }))

  function selectCourse(row: ReviewRow, courseId: string) {
    const course =
      row.candidates.find((candidate) => candidate.id === courseId) ??
      coursesData?.items.find((candidate) => candidate.id === courseId)
    if (!course) return

    onUpdate(row.rowId, {
      courseId: course.id,
      courseName: course.name,
      matchStatus: 'picked',
    })
  }

  return (
    <div className="min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-7">
      <div className="flex flex-wrap items-center gap-2" aria-label="Import summary">
        <Badge className="border-transparent bg-ok-soft text-ok" variant="outline">
          {matchedCount} matched
        </Badge>
        <span aria-hidden="true" className="text-text-muted">
          ·
        </span>
        <span className="font-mono text-xs text-text-muted">{rows.length} rows</span>
      </div>

      <div className="hidden min-w-0 overflow-x-auto rounded-xl border border-line md:block">
        <table className="w-[1000px] min-w-[1000px] table-fixed border-collapse">
          <colgroup>
            <col style={{ width: '22%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: 128 }} />
            <col style={{ width: 128 }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: 48 }} />
          </colgroup>
          <thead className="bg-surface-2 text-left font-mono text-[11px] uppercase tracking-wide text-text-muted">
            <tr>
              {['Course', 'Title', 'Date', 'Start', 'End', 'Room'].map((heading) => (
                <th key={heading} scope="col" className="px-2.5 py-2.5 font-medium">
                  {heading}
                </th>
              ))}
              <th scope="col" className="px-2.5 py-2.5 font-medium">
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.rowId} className="border-t border-line">
                <td className="px-2.5 py-2.5 align-top">
                  <div className="grid min-w-0 gap-1.5">
                    <StatusBadge row={row} />
                    <span className="truncate font-mono text-xs font-medium text-ink">
                      {row.courseCode}
                    </span>
                    <span className="truncate text-xs text-text-muted">
                      {row.courseName ?? 'Course not matched'}
                    </span>
                    <CourseChoice
                      row={row}
                      rowNumber={index + 1}
                      courseOptions={courseOptions}
                      onSelect={(courseId) => selectCourse(row, courseId)}
                    />
                    <MovedExamWarning row={row} />
                  </div>
                </td>
                <td className="px-2.5 py-2.5 align-top">
                  <Input
                    aria-label={`Title for row ${index + 1}`}
                    value={row.title}
                    onChange={(event) => onUpdate(row.rowId, { title: event.target.value })}
                    className="h-9 min-w-0 px-2 text-sm"
                  />
                </td>
                <td className="px-2.5 py-2.5 align-top">
                  <Input
                    aria-label={`Date for row ${index + 1}`}
                    type="date"
                    value={row.date}
                    onChange={(event) => onUpdate(row.rowId, { date: event.target.value })}
                    className="h-9 min-w-0 px-2 text-xs tabular-nums"
                  />
                </td>
                <td className="px-0.5 py-2.5 align-top">
                  <Input
                    aria-label={`Start time for row ${index + 1}`}
                    type="time"
                    value={row.startsAt}
                    onChange={(event) => onUpdate(row.rowId, { startsAt: event.target.value })}
                    className="h-9 min-w-0 px-1.5 text-xs tabular-nums"
                  />
                </td>
                <td className="px-0.5 py-2.5 align-top">
                  <Input
                    aria-label={`End time for row ${index + 1}`}
                    type="time"
                    value={row.endsAt ?? ''}
                    onChange={(event) =>
                      onUpdate(row.rowId, { endsAt: event.target.value || null })
                    }
                    className="h-9 min-w-0 px-1.5 text-xs tabular-nums"
                  />
                </td>
                <td className="px-2.5 py-2.5 align-top">
                  <Input
                    aria-label={`Room for row ${index + 1}`}
                    value={row.examRoom ?? ''}
                    placeholder="Room"
                    onChange={(event) =>
                      onUpdate(row.rowId, { examRoom: event.target.value || null })
                    }
                    className="h-9 min-w-0 px-2 text-sm"
                  />
                </td>
                <td className="px-1.5 py-2.5 text-center align-top">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove row ${index + 1}`}
                    onClick={() => onRemove(row.rowId)}
                  >
                    <X aria-hidden="true" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:hidden">
        {rows.map((row, index) => (
          <article
            key={row.rowId}
            className="grid gap-3 rounded-xl border border-line bg-surface p-3"
            aria-label={`Exam row ${index + 1}`}
          >
            <div className="flex items-center justify-between gap-3">
              <StatusBadge row={row} />
              <Button
                type="button"
                variant="quiet"
                size="sm"
                aria-label={`Remove row ${index + 1}`}
                onClick={() => onRemove(row.rowId)}
              >
                <X className="hidden md:block" aria-hidden="true" />
                <span>Remove</span>
              </Button>
            </div>
            <div className="grid gap-1">
              <span className="font-mono text-xs font-semibold text-ink">{row.courseCode}</span>
              <span className="text-xs text-text-muted">
                {row.courseName ?? 'Course not matched'}
              </span>
              <CourseChoice
                row={row}
                rowNumber={index + 1}
                courseOptions={courseOptions}
                onSelect={(courseId) => selectCourse(row, courseId)}
              />
            </div>
            <MovedExamWarning row={row} />
            <label className="grid gap-1 text-xs text-text-muted">
              Title
              <Input
                aria-label={`Mobile title for row ${index + 1}`}
                value={row.title}
                onChange={(event) => onUpdate(row.rowId, { title: event.target.value })}
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1 text-xs text-text-muted">
                Date
                <Input
                  aria-label={`Mobile date for row ${index + 1}`}
                  type="date"
                  value={row.date}
                  onChange={(event) => onUpdate(row.rowId, { date: event.target.value })}
                />
              </label>
              <label className="grid gap-1 text-xs text-text-muted">
                Room
                <Input
                  aria-label={`Mobile room for row ${index + 1}`}
                  value={row.examRoom ?? ''}
                  placeholder="Room"
                  onChange={(event) =>
                    onUpdate(row.rowId, { examRoom: event.target.value || null })
                  }
                />
              </label>
              <label className="grid gap-1 text-xs text-text-muted">
                Start
                <Input
                  aria-label={`Mobile start time for row ${index + 1}`}
                  type="time"
                  value={row.startsAt}
                  onChange={(event) => onUpdate(row.rowId, { startsAt: event.target.value })}
                />
              </label>
              <label className="grid gap-1 text-xs text-text-muted">
                End
                <Input
                  aria-label={`Mobile end time for row ${index + 1}`}
                  type="time"
                  value={row.endsAt ?? ''}
                  onChange={(event) => onUpdate(row.rowId, { endsAt: event.target.value || null })}
                />
              </label>
            </div>
          </article>
        ))}
      </div>

      <div className="flex items-start gap-2 rounded-xl bg-surface-2 px-3 py-2.5 text-sm text-ink">
        <Clock3 className="mt-0.5 size-4 shrink-0 text-sky" aria-hidden="true" />
        <span>
          Times use your timezone: <strong>{timezone}</strong>. Exams starting within 14 days are
          reminded as soon as they&apos;re published.
        </span>
      </div>
    </div>
  )
}
