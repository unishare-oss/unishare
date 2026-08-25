'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/contexts/auth-context'
import { CourseOutlineEditor } from './course-outline-editor'

const YEARS = [1, 2, 3, 4, 5, 6]
const NO_YEAR = '__none__'

interface AddCourseModalProps {
  open: boolean
  code: string
  name: string
  yearLevel: number | null
  onCodeChange: (value: string) => void
  onNameChange: (value: string) => void
  onYearChange: (value: number | null) => void
  onClose: () => void
  onSubmit: (code: string, name: string, yearLevel: number | null) => void
  editMode?: boolean
  /** Present when editing an existing course — enables the outline editor below. */
  courseId?: string
}

export function AddCourseModal({
  open,
  code,
  name,
  yearLevel,
  onCodeChange,
  onNameChange,
  onYearChange,
  onClose,
  onSubmit,
  editMode,
  courseId,
}: AddCourseModalProps) {
  const { user } = useAuth()
  // Course code/name/yearLevel edits are ADMIN-only server-side (PATCH /courses/:id) — the
  // outline endpoints are the only course-management capability MODERATOR actually has.
  const fieldsReadOnly = editMode && user?.role === 'MODERATOR'

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editMode ? 'Edit Course' : 'Add Course'}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!fieldsReadOnly && code.trim() && name.trim()) {
              onSubmit(code.trim(), name.trim(), yearLevel)
              onClose()
            }
          }}
        >
          <div className="flex flex-col gap-4">
            <div>
              <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
                Course Code
              </label>
              <Input
                autoFocus
                type="text"
                value={code}
                onChange={(e) => onCodeChange(e.target.value)}
                placeholder="e.g. CS501"
                className="h-[42px]"
                disabled={fieldsReadOnly}
              />
            </div>
            <div>
              <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
                Course Name
              </label>
              <Input
                type="text"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="e.g. Advanced Databases"
                className="h-[42px]"
                disabled={fieldsReadOnly}
              />
            </div>
            <div>
              <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
                Year Level <span className="normal-case tracking-normal">(optional)</span>
              </label>
              <Select
                value={yearLevel != null ? String(yearLevel) : NO_YEAR}
                onValueChange={(v) => onYearChange(v === NO_YEAR ? null : Number(v))}
                disabled={fieldsReadOnly}
              >
                <SelectTrigger className="h-[42px]">
                  <SelectValue placeholder="Any year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_YEAR}>Any year</SelectItem>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      Year {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {!fieldsReadOnly && (
            <div className="flex items-center gap-3 justify-end mt-5">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!code.trim() || !name.trim()}
                className="bg-amber text-primary-foreground hover:bg-amber-hover"
              >
                {editMode ? 'Save' : 'Create'}
              </Button>
            </div>
          )}
        </form>

        {editMode && courseId && (
          <>
            <Separator className="my-1" />
            <CourseOutlineEditor courseId={courseId} />
            <div className="flex justify-end">
              <Button type="button" variant="ghost" onClick={onClose}>
                Close
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
