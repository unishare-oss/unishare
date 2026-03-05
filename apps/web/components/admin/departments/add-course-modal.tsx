'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface AddCourseModalProps {
  code: string
  name: string
  onCodeChange: (value: string) => void
  onNameChange: (value: string) => void
  onClose: () => void
  onSubmit: (code: string, name: string) => void
}

export function AddCourseModal({
  code,
  name,
  onCodeChange,
  onNameChange,
  onClose,
  onSubmit,
}: AddCourseModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-surface-dark/30" />
      <div
        className="relative bg-card border border-border rounded-[6px] p-6 w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-mono text-sm font-medium text-foreground">Add Course</h3>
          <Button variant="ghost" size="icon-xs" onClick={onClose}>
            <X className="size-4 text-text-muted" strokeWidth={1.5} />
          </Button>
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
              Course Code
            </label>
            <Input
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
        </div>
        <div className="flex items-center gap-3 justify-end mt-5">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (code.trim() && name.trim()) {
                onSubmit(code.trim(), name.trim())
                onClose()
              }
            }}
            disabled={!code.trim() || !name.trim()}
            className="bg-amber text-primary-foreground hover:bg-amber-hover"
          >
            Create
          </Button>
        </div>
      </div>
    </div>
  )
}
