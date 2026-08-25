'use client'

import { ChevronLeft, ChevronRight, Pencil, Trash2, MapPin } from 'lucide-react'
import { format, isSameDay, isToday, addMonths, subMonths } from 'date-fns'
import { Button } from '@/components/ui/button'
import { buildMonthGrid, WEEKDAY_LABELS } from '@/lib/calendar/month-grid'
import type { ExamEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

const MAX_VISIBLE_CHIPS = 2

export interface ExamCalendarViewProps {
  month: Date
  onMonthChange: (date: Date) => void
  selectedDay: Date | undefined
  onSelectDay: (date: Date) => void
  examsByDay: Map<string, string[]>
  selectedDayExams: ExamEntity[]
  canManage: boolean
  onEdit: (exam: ExamEntity) => void
  onDelete: (examId: string) => void
}

export function ClassicExamCalendar({
  month,
  onMonthChange,
  selectedDay,
  onSelectDay,
  examsByDay,
  selectedDayExams,
  canManage,
  onEdit,
  onDelete,
}: ExamCalendarViewProps) {
  const days = buildMonthGrid(month)

  return (
    <div className="flex flex-col gap-6">
      <div className="border border-border rounded-[6px] p-4">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon-xs" onClick={() => onMonthChange(subMonths(month, 1))}>
            <ChevronLeft className="size-4" strokeWidth={1.5} />
          </Button>
          <p className="text-sm font-semibold">{format(month, 'MMMM yyyy')}</p>
          <Button variant="ghost" size="icon-xs" onClick={() => onMonthChange(addMonths(month, 1))}>
            <ChevronRight className="size-4" strokeWidth={1.5} />
          </Button>
        </div>

        <div className="grid grid-cols-7 text-center font-mono text-[10px] text-text-muted tracking-wide mb-2">
          {WEEKDAY_LABELS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map(({ date, isOutside }) => {
            const key = format(date, 'yyyy-MM-dd')
            const codes = examsByDay.get(key) ?? []
            const selected = selectedDay && isSameDay(date, selectedDay)
            return (
              <button
                key={key}
                onClick={() => onSelectDay(date)}
                className={[
                  'flex flex-col items-center gap-1 rounded-md py-1.5 h-20 sm:h-24 transition-colors',
                  selected ? 'bg-amber-subtle' : 'hover:bg-muted',
                ].join(' ')}
              >
                <span
                  className={[
                    'flex size-6 items-center justify-center rounded-full text-xs font-medium',
                    selected
                      ? 'bg-amber text-primary-foreground'
                      : isOutside
                        ? 'text-text-muted/50'
                        : 'text-foreground',
                    isToday(date) && !selected ? 'ring-1 ring-amber ring-offset-1' : '',
                  ].join(' ')}
                >
                  {format(date, 'd')}
                </span>
                {codes.length > 0 && (
                  <div className="flex flex-col items-center gap-0.5 leading-none">
                    {codes.slice(0, MAX_VISIBLE_CHIPS).map((code) => (
                      <span
                        key={code}
                        className={[
                          'rounded-sm px-1 font-mono text-[9px] font-semibold',
                          selected ? 'bg-card text-amber' : 'bg-amber-subtle text-amber',
                        ].join(' ')}
                      >
                        {code}
                      </span>
                    ))}
                    {codes.length > MAX_VISIBLE_CHIPS && (
                      <span className="font-mono text-[9px] text-text-muted">
                        +{codes.length - MAX_VISIBLE_CHIPS}
                      </span>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="border-t-2 border-amber pt-4">
        <h3 className="font-mono text-[11px] uppercase tracking-wider text-text-muted mb-3">
          {selectedDay ? format(selectedDay, 'EEEE, MMMM d') : 'Select a day'}
        </h3>

        {selectedDayExams.length === 0 ? (
          <p className="text-sm text-text-muted py-6 text-center">No exams on this day.</p>
        ) : (
          <div className="divide-y divide-border">
            {selectedDayExams.map((exam) => (
              <div
                key={exam.id}
                className="flex items-start gap-4 py-4 pl-4 border-l-4 border-amber group"
              >
                <div className="font-mono text-xs text-text-muted shrink-0 w-16 leading-relaxed">
                  {format(new Date(exam.startsAt), 'p')}
                  {exam.endsAt && (
                    <>
                      <br />
                      {format(new Date(exam.endsAt), 'p')}
                    </>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[11px] text-amber font-medium truncate">
                    {exam.course.code} — {exam.course.name}
                  </p>
                  <p className="text-base text-foreground font-semibold">{exam.title}</p>
                  {exam.examRoom && (
                    <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                      <MapPin className="size-3" strokeWidth={1.5} />
                      {exam.examRoom}
                    </p>
                  )}
                  {exam.notes && <p className="text-xs text-text-secondary mt-1.5">{exam.notes}</p>}
                </div>
                {canManage && (
                  <div className="invisible group-hover:visible flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Edit exam"
                      onClick={() => onEdit(exam)}
                    >
                      <Pencil className="size-3.5" strokeWidth={1.5} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Delete exam"
                      onClick={() => onDelete(exam.id)}
                      className="hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-3.5" strokeWidth={1.5} />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
