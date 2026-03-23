'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
}: AddCourseModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{editMode ? 'Edit Course' : 'Add Course'}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (code.trim() && name.trim()) {
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
              />
            </div>
            <div>
              <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
                Year Level <span className="normal-case tracking-normal">(optional)</span>
              </label>
              <Select
                value={yearLevel != null ? String(yearLevel) : NO_YEAR}
                onValueChange={(v) => onYearChange(v === NO_YEAR ? null : Number(v))}
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
        </form>
      </DialogContent>
    </Dialog>
  )
}
