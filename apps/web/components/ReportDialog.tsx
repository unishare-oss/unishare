'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Flag } from 'lucide-react'
import { useState } from 'react'
import { useReportPost } from '@/hooks/useReportPost'
import { cn } from '@/lib/utils'

interface ReportDialogProps {
  postId: string
  onSuccess?: () => void
}

type ReportReason = 'SPAM' | 'OFFENSIVE' | 'COPYRIGHT' | 'OTHER'

const REPORT_REASONS: { value: ReportReason; label: string; description: string }[] = [
  { value: 'SPAM', label: 'Spam', description: 'Duplicate, off-topic, or self-promotion' },
  { value: 'OFFENSIVE', label: 'Offensive', description: 'Inappropriate language or content' },
  { value: 'COPYRIGHT', label: 'Copyright', description: 'Violates intellectual property rights' },
  { value: 'OTHER', label: 'Other', description: 'Other policy violation' },
]

export function ReportDialog({ postId, onSuccess }: ReportDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null)
  const [comment, setComment] = useState('')
  const { mutate: reportPost, isPending } = useReportPost()

  function handleSubmit() {
    if (!selectedReason) return
    reportPost(
      { postId, reason: selectedReason, comment: comment.trim() || undefined },
      {
        onSuccess: () => {
          setOpen(false)
          setSelectedReason(null)
          setComment('')
          onSuccess?.()
        },
      },
    )
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setSelectedReason(null)
      setComment('')
    }
    setOpen(next)
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        className="shrink-0 mt-1 hover:bg-background text-text-muted hover:text-destructive"
        onClick={() => setOpen(true)}
        aria-label="Report post"
      >
        <Flag className="size-4" strokeWidth={1.5} />
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Report post</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {REPORT_REASONS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setSelectedReason(r.value)}
                className={cn(
                  'w-full text-left px-4 py-3 rounded-lg border transition-colors',
                  selectedReason === r.value
                    ? 'border-amber bg-amber/5 text-foreground'
                    : 'border-border hover:border-border/80 hover:bg-muted text-foreground',
                )}
              >
                <p className="text-sm font-medium">{r.label}</p>
                <p className="text-xs text-text-muted mt-0.5">{r.description}</p>
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-text-muted">
              Additional context <span className="text-xs">(optional, max 500 chars)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 500))}
              rows={3}
              placeholder="Add any details that would help our moderators..."
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-amber"
            />
            <p className="text-right text-xs text-text-muted">{comment.length}/500</p>
          </div>

          <Button onClick={handleSubmit} disabled={!selectedReason || isPending} className="w-full">
            {isPending ? 'Submitting…' : 'Submit report'}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}
