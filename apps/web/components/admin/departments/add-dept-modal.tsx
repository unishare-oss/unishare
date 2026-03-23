'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface AddDeptModalProps {
  open: boolean
  value: string
  onChange: (value: string) => void
  onClose: () => void
  onSubmit: (name: string) => void
  editMode?: boolean
}

export function AddDeptModal({
  open,
  value,
  onChange,
  onClose,
  onSubmit,
  editMode,
}: AddDeptModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{editMode ? 'Edit Department' : 'Add Department'}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (value.trim()) {
              onSubmit(value.trim())
              onClose()
            }
          }}
        >
          <div>
            <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
              Name
            </label>
            <Input
              autoFocus
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="e.g. Computer Science"
              className="h-[42px]"
            />
          </div>
          <div className="flex items-center gap-3 justify-end mt-5">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!value.trim()}
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
