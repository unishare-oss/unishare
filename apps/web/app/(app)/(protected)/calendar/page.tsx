'use client'

import { useMemo, useState } from 'react'
import { startOfMonth, endOfMonth, format, isSameDay } from 'date-fns'
import { Plus, Pencil, Trash2, CalendarDays, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { SearchSelect } from '@/components/ui/search-select'
import { Calendar } from '@/components/ui/calendar'
import { ExamDayButton } from '@/components/calendar/exam-day-button'
import {
  AddExamModal,
  EMPTY_EXAM_FORM,
  toIsoOrNull,
  type ExamFormState,
} from '@/components/calendar/add-exam-modal'
import { useAuth } from '@/contexts/auth-context'
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

export default function CalendarPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
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

  const examDayDates = useMemo(() => exams.map((e) => new Date(e.startsAt)), [exams])
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
        <div className="max-w-3xl mx-auto px-6 py-6 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="w-56">
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

          <div className="flex flex-col md:flex-row gap-6">
            <Calendar
              mode="single"
              captionLayout="dropdown"
              month={month}
              onMonthChange={setMonth}
              selected={selectedDay}
              onSelect={setSelectedDay}
              modifiers={{ hasExam: examDayDates }}
              components={{ DayButton: ExamDayButton }}
              className="border border-border rounded-[6px]"
            />

            <div className="flex-1 border border-border rounded-[6px] p-4 min-w-0">
              <h3 className="font-mono text-[11px] uppercase tracking-wider text-text-muted mb-3">
                {selectedDay ? format(selectedDay, 'EEEE, MMMM d') : 'Select a day'}
              </h3>

              {selectedDayExams.length === 0 ? (
                <div className="py-8 text-center">
                  <CalendarDays className="size-8 text-text-muted mx-auto mb-2" strokeWidth={1} />
                  <p className="text-sm text-text-muted">No exams on this day.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {selectedDayExams.map((exam) => (
                    <div
                      key={exam.id}
                      className="flex items-start gap-3 p-3 border border-border rounded-[6px] group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-[11px] text-amber font-medium truncate">
                          {exam.course.code} — {exam.course.name}
                        </p>
                        <p className="text-sm text-foreground font-medium truncate">{exam.title}</p>
                        <p className="text-xs text-text-muted mt-1">
                          {format(new Date(exam.startsAt), 'p')}
                          {exam.endsAt && ` – ${format(new Date(exam.endsAt), 'p')}`}
                        </p>
                        {exam.examRoom && (
                          <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                            <MapPin className="size-3" strokeWidth={1.5} />
                            {exam.examRoom}
                          </p>
                        )}
                        {exam.notes && (
                          <p className="text-xs text-text-secondary mt-1.5">{exam.notes}</p>
                        )}
                      </div>
                      {canManage && (
                        <div className="invisible group-hover:visible flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Edit exam"
                            onClick={() => openEditModal(exam)}
                          >
                            <Pencil className="size-3.5" strokeWidth={1.5} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Delete exam"
                            onClick={() => removeExam({ id: exam.id })}
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
