'use client'

import { Button } from '@/components/ui/button'
import { MentionTextarea } from '@/components/post-detail/mention-textarea'
import { Textarea } from '@/components/ui/textarea'
import type { MentionPerson } from '@/lib/mentions'

interface CommentEditorProps {
  value: string
  onChange: (value: string) => void
  onCancel: () => void
  onSubmit: () => void
  isPending: boolean
  submitLabel: string
  pendingLabel: string
  placeholder?: string
  /** Turns on @ suggestions. Leave out where mentions are not saved, such as editing. */
  onPick?: (person: MentionPerson) => void
}

export function CommentEditor({
  value,
  onChange,
  onCancel,
  onSubmit,
  isPending,
  submitLabel,
  pendingLabel,
  placeholder,
  onPick,
}: CommentEditorProps) {
  const shared = {
    value,
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault()
        if (value.trim() && !isPending) onSubmit()
      }
    },
    placeholder,
    rows: 3,
    className: 'resize-none',
  }

  return (
    <div className="space-y-3">
      {onPick ? (
        <MentionTextarea {...shared} onValueChange={onChange} onPick={onPick} />
      ) : (
        <Textarea {...shared} onChange={(event) => onChange(event.target.value)} />
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-text-muted select-none">
          <kbd className="font-mono">Shift</kbd> + <kbd className="font-mono">Enter</kbd> to submit
        </span>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onSubmit}
            disabled={!value.trim() || isPending}
            className="bg-amber text-primary-foreground hover:bg-amber-hover"
          >
            {isPending ? pendingLabel : submitLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
