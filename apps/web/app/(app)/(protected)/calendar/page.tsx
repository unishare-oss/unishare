'use client'

import { useMemo, useState } from 'react'
import { startOfMonth, endOfMonth, format, isSameDay, differenceInCalendarDays } from 'date-fns'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { SearchSelect } from '@/components/ui/search-select'
import { ClassicExamCalendar } from '@/components/calendar/classic-exam-calendar'
import { ArcadeExamCalendar } from '@/components/calendar/arcade-exam-calendar'
import { DeskExamCalendar } from '@/components/calendar/desk-exam-calendar'
import {
  AddExamModal,
  EMPTY_EXAM_FORM,
  toIsoOrNull,
  type ExamFormState,
} from '@/components/calendar/add-exam-modal'
import { useAuth } from '@/contexts/auth-context'
import { useFeedStyleStore } from '@/lib/store'
import { useDepartmentsControllerFindAll } from '@/src/lib/api/generated/departments/departments'
import {
  useExamsControllerFindAll,
  useExamsControllerCreate,
  useExamsControllerUpdate,
  useExamsControllerRemove,
  getExamsControllerFindAllQueryKey,
} from '@/src/lib/api/generated/exams/exams'
import type { ExamEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

function toFormState(exam: ExamEntity): ExamFormState {
  const starts = new Date(exam.startsAt)
  const ends = exam.endsAt ? new Date(exam.endsAt) : null
  return {
    title: exam.title,
    departmentId: exam.course.department.id,
    courseId: exam.course.id,
    startDate: format(starts, 'yyyy-MM-dd'),
    startTime: format(starts, 'HH:mm'),
    endTime: ends ? format(ends, 'HH:mm') : '',
    examRoom: exam.examRoom ?? '',
    notes: exam.notes ?? '',
  }
}

/** "3 exams this month · next in 5 days" — gives the page a sense of what's coming, not just a static grid. */
function statusLine(exams: ExamEntity[]): string {
  if (exams.length === 0) return 'No exams this month'

  const now = new Date()
  const next = exams
    .filter((e) => new Date(e.startsAt) >= now)
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))[0]

  const count = `${exams.length} exam${exams.length === 1 ? '' : 's'} this month`
  if (!next) return count

  const days = differenceInCalendarDays(new Date(next.startsAt), now)
  const when = days <= 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`
  return `${count} · next ${when}`
}

export default function CalendarPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const feedStyle = useFeedStyleStore((s) => s.feedStyle)
  const canManage = user?.role === 'ADMIN' || user?.role === 'MODERATOR'

  const [month, setMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(new Date())
  const [departmentId, setDepartmentId] = useState(user?.department?.id ?? '')
  const [courseId, setCourseId] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingExamId, setEditingExamId] = useState<string | null>(null)
  const [form, setForm] = useState<ExamFormState>(EMPTY_EXAM_FORM)

  const { data: departments } = useDepartmentsControllerFindAll({
    query: { select: (r) => r.data },
  })
  const deptOptions = useMemo(
    () => [
      { value: '', label: 'All departments' },
      ...(departments ?? []).map((d) => ({ value: d.id, label: d.name })),
    ],
    [departments],
  )

  const from = startOfMonth(month).toISOString()
  const to = endOfMonth(month).toISOString()

  const { data: exams = [] } = useExamsControllerFindAll(
    { from, to, ...(departmentId ? { departmentId } : {}), ...(courseId ? { courseId } : {}) },
    { query: { select: (r) => r.data } },
  )

  const examsByDay = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const exam of exams) {
      const key = format(new Date(exam.startsAt), 'yyyy-MM-dd')
      map.set(key, [...(map.get(key) ?? []), exam.course.code])
    }
    return map
  }, [exams])

  const selectedDayExams = useMemo(
    () => (selectedDay ? exams.filter((e) => isSameDay(new Date(e.startsAt), selectedDay)) : []),
    [exams, selectedDay],
  )

  function invalidateExams() {
    queryClient.invalidateQueries({ queryKey: getExamsControllerFindAllQueryKey() })
  }

  const { mutate: createExam, isPending: creating } = useExamsControllerCreate({
    mutation: {
      onSuccess: () => {
        toast.success('Exam added')
        invalidateExams()
        closeModal()
      },
      onError: () => toast.error('Failed to add exam'),
    },
  })

  const { mutate: updateExam, isPending: updating } = useExamsControllerUpdate({
    mutation: {
      onSuccess: () => {
        toast.success('Exam updated')
        invalidateExams()
        closeModal()
      },
      onError: () => toast.error('Failed to update exam'),
    },
  })

  const { mutate: removeExam } = useExamsControllerRemove({
    mutation: {
      onSuccess: () => {
        toast.success('Exam deleted')
        invalidateExams()
      },
      onError: () => toast.error('Failed to delete exam'),
    },
  })

  function closeModal() {
    setModalOpen(false)
    setEditingExamId(null)
    setForm(EMPTY_EXAM_FORM)
  }

  function openCreateModal() {
    setForm({
      ...EMPTY_EXAM_FORM,
      departmentId,
      startDate: selectedDay ? format(selectedDay, 'yyyy-MM-dd') : '',
    })
    setEditingExamId(null)
    setModalOpen(true)
  }

  function openEditModal(exam: ExamEntity) {
    setForm(toFormState(exam))
    setEditingExamId(exam.id)
    setModalOpen(true)
  }

  function handleSubmit() {
    const startsAt = toIsoOrNull(form.startDate, form.startTime)
    if (!startsAt) return
    const endsAt = form.endTime ? toIsoOrNull(form.startDate, form.endTime) : null
    if (endsAt && endsAt <= startsAt) {
      toast.error('End time must be after the start time')
      return
    }
    const payload = {
      title: form.title.trim(),
      courseId: form.courseId,
      startsAt,
      endsAt,
      examRoom: form.examRoom.trim() || undefined,
      notes: form.notes.trim() || undefined,
    }
    if (editingExamId) updateExam({ id: editingExamId, data: payload })
    else createExam({ data: payload })
  }

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="Exam Calendar"
        action={
          canManage && (
            <Button
              onClick={openCreateModal}
              size="sm"
              className="bg-amber text-primary-foreground hover:bg-amber-hover"
            >
              <Plus className="size-3.5" strokeWidth={1.5} />
              Add Exam
            </Button>
          )
        }
      />

      <div className="flex-1 bg-card">
        <div className="max-w-4xl mx-auto px-6 py-6 flex flex-col gap-6">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-[13px] text-text-muted">{statusLine(exams)}</p>
            <div className="w-48 shrink-0">
              <SearchSelect
                options={deptOptions}
                value={departmentId}
                onChange={(v) => {
                  setDepartmentId(v)
                  setCourseId('')
                }}
                placeholder="All departments"
              />
            </div>
          </div>

          {(() => {
            const ExamCalendarView =
              feedStyle === 'arcade'
                ? ArcadeExamCalendar
                : feedStyle === 'desk'
                  ? DeskExamCalendar
                  : ClassicExamCalendar
            return (
              <ExamCalendarView
                month={month}
                onMonthChange={setMonth}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
                examsByDay={examsByDay}
                selectedDayExams={selectedDayExams}
                canManage={canManage}
                onEdit={openEditModal}
                onDelete={(examId) => removeExam({ id: examId })}
              />
            )
          })()}
        </div>
      </div>

      {canManage && (
        <AddExamModal
          open={modalOpen}
          value={form}
          onChange={setForm}
          onClose={closeModal}
          onSubmit={handleSubmit}
          editMode={!!editingExamId}
          submitting={creating || updating}
        />
      )}
    </div>
  )
}
