'use client'

import type { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
  isPending?: boolean
  icon?: ReactNode
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  isPending = false,
  icon,
}: ConfirmDialogProps) {
  const handleOpenChange = (nextOpen: boolean) => {
    if (isPending) {
      return
    }

    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={!isPending}
        className={cn('rounded-[6px] border-border bg-card p-0 shadow-xl')}
        onPointerDownOutside={(event) => {
          if (isPending) {
            event.preventDefault()
          }
        }}
        onEscapeKeyDown={(event) => {
          if (isPending) {
            event.preventDefault()
          }
        }}
        onInteractOutside={(event) => {
          if (isPending) {
            event.preventDefault()
          }
        }}
      >
        <div className="border-b border-border bg-muted/40 px-6 py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-[6px] bg-amber-subtle text-amber">
              {icon ?? <AlertTriangle className="size-5" strokeWidth={1.8} />}
            </div>
            <DialogHeader className="gap-1 text-left">
              <DialogTitle className="text-base font-semibold tracking-tight text-foreground">
                {title}
              </DialogTitle>
              <DialogDescription className="text-sm leading-6 text-text-muted">
                {description}
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        <DialogFooter className="px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
            className="rounded-[6px] border-border bg-card text-foreground hover:bg-muted"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-[6px]"
          >
            {isPending ? 'Deleting...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
