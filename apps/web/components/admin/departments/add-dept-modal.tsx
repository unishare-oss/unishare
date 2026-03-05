'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface AddDeptModalProps {
  value: string
  onChange: (value: string) => void
  onClose: () => void
  onSubmit: (name: string) => void
}

export function AddDeptModal({ value, onChange, onClose, onSubmit }: AddDeptModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-surface-dark/30" />
      <div
        className="relative bg-card border border-border rounded-[6px] p-6 w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-mono text-sm font-medium text-foreground">Add Department</h3>
          <Button variant="ghost" size="icon-xs" onClick={onClose}>
            <X className="size-4 text-text-muted" strokeWidth={1.5} />
          </Button>
        </div>
        <div>
          <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
            Name
          </label>
          <Input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="e.g. Computer Science"
            className="h-[42px]"
          />
        </div>
        <div className="flex items-center gap-3 justify-end mt-5">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (value.trim()) {
                onSubmit(value.trim())
                onClose()
              }
            }}
            disabled={!value.trim()}
            className="bg-amber text-primary-foreground hover:bg-amber-hover"
          >
            Create
          </Button>
        </div>
      </div>
    </div>
  )
}
