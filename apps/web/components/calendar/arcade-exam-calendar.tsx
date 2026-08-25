'use client'

import { ChevronLeft, ChevronRight, Pencil, Trash2, MapPin } from 'lucide-react'
import { format, isSameDay, isToday, addMonths, subMonths } from 'date-fns'
import { Button } from '@/components/ui/button'
import { buildMonthGrid, WEEKDAY_LABELS } from '@/lib/calendar/month-grid'
import type { ExamCalendarViewProps } from './classic-exam-calendar'

const MAX_VISIBLE_CHIPS = 2

export function ArcadeExamCalendar({
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
      <div className="border-[3px] border-border-strong rounded-xl p-4 shadow-[6px_6px_0_0_var(--shadow-color)] bg-card">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="icon-xs"
            className="border-2 border-border-strong rounded-md"
            onClick={() => onMonthChange(subMonths(month, 1))}
          >
            <ChevronLeft className="size-4" strokeWidth={2} />
          </Button>
          <p className="text-sm font-bold">{format(month, 'MMMM yyyy')}</p>
          <Button
            variant="ghost"
            size="icon-xs"
            className="border-2 border-border-strong rounded-md"
            onClick={() => onMonthChange(addMonths(month, 1))}
          >
            <ChevronRight className="size-4" strokeWidth={2} />
          </Button>
        </div>

        <div className="grid grid-cols-7 text-center font-mono text-[10px] font-bold tracking-wide mb-2">
          {WEEKDAY_LABELS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {days.map(({ date, isOutside }) => {
            const key = format(date, 'yyyy-MM-dd')
            const codes = examsByDay.get(key) ?? []
            const selected = selectedDay && isSameDay(date, selectedDay)
            return (
              <button
                key={key}
                onClick={() => onSelectDay(date)}
                className={[
                  'flex flex-col items-center gap-1 rounded-lg py-1.5 h-20 sm:h-24 border-2 transition-transform',
                  selected
                    ? 'border-border-strong bg-amber-subtle shadow-[3px_3px_0_0_var(--shadow-color)]'
                    : 'border-transparent hover:-translate-x-0.5 hover:-translate-y-0.5',
                ].join(' ')}
              >
                <span
                  className={[
                    'flex size-6 items-center justify-center rounded-md text-xs font-bold',
                    selected
                      ? 'bg-amber border-2 border-border-strong'
                      : isOutside
                        ? 'text-text-muted/50'
                        : 'text-foreground',
                    isToday(date) && !selected ? 'border-2 border-type-exam' : '',
                  ].join(' ')}
                >
                  {format(date, 'd')}
                </span>
                {codes.length > 0 && (
                  <div className="flex flex-col items-center gap-0.5 leading-none">
                    {codes.slice(0, MAX_VISIBLE_CHIPS).map((code) => (
                      <span
                        key={code}
                        className="rounded-sm px-1 font-mono text-[8px] font-bold text-white bg-type-exam"
                      >
                        {code}
                      </span>
                    ))}
                    {codes.length > MAX_VISIBLE_CHIPS && (
                      <span className="font-mono text-[8px] font-bold text-text-muted">
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

      <div>
        <h3 className="font-mono text-[11px] uppercase tracking-wider font-bold mb-3">
          {selectedDay ? format(selectedDay, 'EEEE, MMMM d') : 'Select a day'}
        </h3>

        {selectedDayExams.length === 0 ? (
          <p className="text-sm text-text-muted py-6 text-center">No exams on this day.</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {selectedDayExams.map((exam) => (
              <div
                key={exam.id}
                className="flex items-start gap-4 p-4 border-2 border-border-strong rounded-xl bg-card shadow-[3px_3px_0_0_var(--shadow-color)] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--shadow-color)] group"
              >
                <div className="font-mono text-xs font-bold shrink-0 w-16 leading-relaxed pt-0.5">
                  {format(new Date(exam.startsAt), 'p')}
                  {exam.endsAt && (
                    <>
                      <br />
                      {format(new Date(exam.endsAt), 'p')}
                    </>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="inline-block rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-bold text-white bg-type-exam mb-1.5">
                    {exam.course.code}
                  </span>
                  <p className="text-base text-foreground font-bold">{exam.title}</p>
                  <p className="text-xs text-text-muted mt-0.5">{exam.course.name}</p>
                  {exam.examRoom && (
                    <p className="text-xs text-text-muted flex items-center gap-1 mt-1">
                      <MapPin className="size-3" strokeWidth={2} />
                      {exam.examRoom}
                    </p>
                  )}
                  {exam.notes && <p className="text-xs text-text-secondary mt-1.5">{exam.notes}</p>}
                </div>
                {canManage && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Edit exam"
                      className="border-2 border-border-strong rounded-md"
                      onClick={() => onEdit(exam)}
                    >
                      <Pencil className="size-3.5" strokeWidth={2} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Delete exam"
                      className="border-2 border-border-strong rounded-md hover:text-destructive hover:bg-destructive/10"
                      onClick={() => onDelete(exam.id)}
                    >
                      <Trash2 className="size-3.5" strokeWidth={2} />
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
