'use client'

import { X } from 'lucide-react'

interface AddCourseModalProps {
  code: string
  name: string
  onCodeChange: (value: string) => void
  onNameChange: (value: string) => void
  onClose: () => void
}

export function AddCourseModal({
  code,
  name,
  onCodeChange,
  onNameChange,
  onClose,
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
          <button
            onClick={onClose}
            className="p-1 rounded-[6px] hover:bg-muted transition-colors duration-150"
          >
            <X className="size-4 text-text-muted" strokeWidth={1.5} />
          </button>
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
              Course Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => onCodeChange(e.target.value)}
              placeholder="e.g. CS501"
              className="w-full h-[42px] px-3 bg-card border border-border rounded-[6px] text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-amber"
            />
          </div>
          <div>
            <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
              Course Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="e.g. Advanced Databases"
              className="w-full h-[42px] px-3 bg-card border border-border rounded-[6px] text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-amber"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 justify-end mt-5">
          <button
            onClick={onClose}
            className="h-9 px-4 text-sm text-foreground hover:bg-muted rounded-[6px] transition-colors duration-150"
          >
            Cancel
          </button>
          <button className="h-9 px-4 bg-amber text-primary-foreground text-sm font-medium rounded-[6px] hover:bg-amber-hover transition-colors duration-150">
            Create
          </button>
        </div>
      </div>
    </div>
  )
}
