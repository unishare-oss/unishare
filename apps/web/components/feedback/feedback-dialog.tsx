'use client'

import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { MessageSquareHeart, Bug } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useFeedbackControllerCreate } from '@/src/lib/api/generated/feedback/feedback'
import { CreateFeedbackDtoType } from '@/src/lib/api/generated/unishareAPI.schemas'

const schema = z.object({
  type: z.enum(['FEEDBACK', 'BUG_REPORT']),
  message: z.string().min(10, 'Please describe in at least 10 characters').max(2000),
})

type FormValues = z.infer<typeof schema>

interface FeedbackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const TYPES = [
  {
    value: 'FEEDBACK' as const,
    label: 'Feedback',
    description: 'Suggestions, ideas, or general thoughts',
    icon: MessageSquareHeart,
  },
  {
    value: 'BUG_REPORT' as const,
    label: 'Bug Report',
    description: 'Something is broken or not working right',
    icon: Bug,
  },
]

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const [submitted, setSubmitted] = useState(false)

  const { mutateAsync: submit } = useFeedbackControllerCreate()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'FEEDBACK', message: '' },
  })

  const { isSubmitting } = form.formState
  const selectedType = useWatch({ control: form.control, name: 'type' })

  async function onSubmit(values: FormValues) {
    try {
      await submit({
        data: { type: values.type as CreateFeedbackDtoType, message: values.message },
      })
      setSubmitted(true)
    } catch {
      toast.error('Failed to submit feedback. Please try again.')
    }
  }

  function handleClose(open: boolean) {
    if (!open) {
      form.reset()
      setSubmitted(false)
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        {submitted ? (
          <div className="flex flex-col items-center text-center py-6 gap-3">
            <div className="w-12 h-12 rounded-full bg-amber/15 flex items-center justify-center">
              <MessageSquareHeart className="size-6 text-amber" strokeWidth={1.5} />
            </div>
            <DialogHeader>
              <DialogTitle>Thank you!</DialogTitle>
              <DialogDescription>
                Your feedback has been received. We appreciate you taking the time.
              </DialogDescription>
            </DialogHeader>
            <Button variant="outline" className="mt-2" onClick={() => handleClose(false)}>
              Close
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Send Feedback</DialogTitle>
              <DialogDescription>
                Share your thoughts or report a bug. We read every submission.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 mt-1">
              <div className="grid grid-cols-2 gap-2">
                {TYPES.map(({ value, label, description, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => form.setValue('type', value)}
                    className={cn(
                      'flex flex-col items-start gap-1.5 rounded-[6px] border-2 p-3 text-left transition-all duration-150',
                      selectedType === value
                        ? 'border-amber bg-amber-subtle'
                        : 'border-border hover:bg-muted',
                    )}
                  >
                    <Icon
                      className={cn(
                        'size-4',
                        selectedType === value ? 'text-amber' : 'text-text-muted',
                      )}
                      strokeWidth={1.5}
                    />
                    <p
                      className={cn(
                        'text-sm font-medium',
                        selectedType === value ? 'text-amber' : 'text-foreground',
                      )}
                    >
                      {label}
                    </p>
                    <p className="text-xs text-text-muted leading-snug">{description}</p>
                  </button>
                ))}
              </div>

              <div>
                <Textarea
                  {...form.register('message')}
                  placeholder={
                    selectedType === 'BUG_REPORT'
                      ? 'Describe what happened and how to reproduce it...'
                      : 'Share your thoughts, ideas, or suggestions...'
                  }
                  rows={5}
                  className="rounded-[6px] border-border bg-card px-3 py-3 text-sm placeholder:text-text-muted focus-visible:ring-2 focus-visible:ring-amber resize-none"
                />
                {form.formState.errors.message && (
                  <p className="text-xs text-destructive mt-1">
                    {form.formState.errors.message.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => handleClose(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-amber text-primary-foreground hover:bg-amber-hover"
                >
                  {isSubmitting ? 'Sending...' : 'Send'}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
