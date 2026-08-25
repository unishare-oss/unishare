'use client'

import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SearchSelect } from '@/components/ui/search-select'
import { useDepartmentsControllerFindAll } from '@/src/lib/api/generated/departments/departments'
import { useCoursesControllerFindAll } from '@/src/lib/api/generated/courses/courses'

export interface ExamFormState {
  title: string
  departmentId: string
  courseId: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  examRoom: string
  notes: string
}

export const EMPTY_EXAM_FORM: ExamFormState = {
  title: '',
  departmentId: '',
  courseId: '',
  startDate: '',
  startTime: '',
  endDate: '',
  endTime: '',
  examRoom: '',
  notes: '',
}

interface AddExamModalProps {
  open: boolean
  value: ExamFormState
  onChange: (value: ExamFormState) => void
  onClose: () => void
  onSubmit: () => void
  editMode?: boolean
  submitting?: boolean
}

/** Combines a date input and an optional time input into an ISO string, or null if no date. */
export function toIsoOrNull(date: string, time: string): string | null {
  if (!date) return null
  return new Date(`${date}T${time || '00:00'}`).toISOString()
}

export function AddExamModal({
  open,
  value,
  onChange,
  onClose,
  onSubmit,
  editMode,
  submitting,
}: AddExamModalProps) {
  const { data: departments } = useDepartmentsControllerFindAll({
    query: { select: (r) => r.data },
  })
  const { data: coursesData } = useCoursesControllerFindAll(
    { limit: 100, ...(value.departmentId ? { departmentId: value.departmentId } : {}) },
    { query: { select: (r) => r.data } },
  )

  const deptOptions = useMemo(
    () => (departments ?? []).map((d) => ({ value: d.id, label: d.name })),
    [departments],
  )
  const courseOptions = useMemo(
    () => (coursesData?.items ?? []).map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` })),
    [coursesData?.items],
  )

  const canSubmit = value.title.trim().length >= 3 && !!value.courseId && !!value.startDate

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editMode ? 'Edit Exam' : 'Add Exam'}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (canSubmit) onSubmit()
          }}
        >
          <div className="flex flex-col gap-4">
            <div>
              <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
                Title
              </label>
              <Input
                autoFocus
                value={value.title}
                onChange={(e) => onChange({ ...value, title: e.target.value })}
                placeholder="e.g. Midterm Exam"
                className="h-[42px]"
              />
            </div>

            <div>
              <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
                Department
              </label>
              <SearchSelect
                options={deptOptions}
                value={value.departmentId}
                onChange={(v) => onChange({ ...value, departmentId: v, courseId: '' })}
                placeholder="Select a department…"
              />
            </div>

            <div>
              <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
                Course
              </label>
              <SearchSelect
                options={courseOptions}
                value={value.courseId}
                onChange={(v) => onChange({ ...value, courseId: v })}
                placeholder={
                  courseOptions.length === 0 ? 'Select a department first' : 'Select a course…'
                }
                disabled={courseOptions.length === 0}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
                  Date
                </label>
                <Input
                  type="date"
                  value={value.startDate}
                  onChange={(e) => onChange({ ...value, startDate: e.target.value })}
                  className="h-[42px]"
                />
              </div>
              <div>
                <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
                  Start time
                </label>
                <Input
                  type="time"
                  value={value.startTime}
                  onChange={(e) => onChange({ ...value, startTime: e.target.value })}
                  className="h-[42px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
                  End date <span className="normal-case tracking-normal">(optional)</span>
                </label>
                <Input
                  type="date"
                  value={value.endDate}
                  onChange={(e) => onChange({ ...value, endDate: e.target.value })}
                  className="h-[42px]"
                />
              </div>
              <div>
                <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
                  End time
                </label>
                <Input
                  type="time"
                  value={value.endTime}
                  onChange={(e) => onChange({ ...value, endTime: e.target.value })}
                  className="h-[42px]"
                />
              </div>
            </div>

            <div>
              <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
                Room <span className="normal-case tracking-normal">(optional)</span>
              </label>
              <Input
                value={value.examRoom}
                onChange={(e) => onChange({ ...value, examRoom: e.target.value })}
                placeholder="e.g. Room 204"
                className="h-[42px]"
              />
            </div>

            <div>
              <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
                Notes <span className="normal-case tracking-normal">(optional)</span>
              </label>
              <Textarea
                value={value.notes}
                onChange={(e) => onChange({ ...value, notes: e.target.value })}
                placeholder="Anything students should know"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 justify-end mt-5">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit || submitting}
              className="bg-amber text-primary-foreground hover:bg-amber-hover"
            >
              {editMode ? 'Save' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
