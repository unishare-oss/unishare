import { Clock3, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ReviewRow } from './import-timetable.types'

interface ImportTimetableReviewProps {
  rows: ReviewRow[]
  timezone: string
  onUpdate: (rowId: number, update: Partial<ReviewRow>) => void
  onRemove: (rowId: number) => void
}

function StatusBadge({ row }: { row: ReviewRow }) {
  const label =
    row.matchStatus === 'matched'
      ? 'Matched'
      : row.matchStatus === 'ambiguous'
        ? 'Pick a course'
        : 'Course not found'
  const statusClass =
    row.matchStatus === 'matched'
      ? 'bg-ok-soft text-ok'
      : row.matchStatus === 'ambiguous'
        ? 'bg-warn-soft text-warn'
        : 'bg-bad-soft text-bad'

  return (
    <Badge className={`border-transparent ${statusClass}`} variant="outline">
      {label}
    </Badge>
  )
}

export function ImportTimetableReview({
  rows,
  timezone,
  onUpdate,
  onRemove,
}: ImportTimetableReviewProps) {
  const matchedCount = rows.filter((row) => row.matchStatus === 'matched').length

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
            </div>
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
