'use client'

import { useState } from 'react'
import { FileText, GraduationCap, ClipboardList, Check, AlertTriangle } from 'lucide-react'
import type { PostType } from '@/lib/posts/form-types'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

export type { PostType } from '@/lib/posts/form-types'

interface TypeStepProps {
  postType: PostType | null
  onSelect: (type: PostType) => void
}

export function TypeStep({ postType, onSelect }: TypeStepProps) {
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [disclaimerChecked, setDisclaimerChecked] = useState(false)

  function handleExerciseClick() {
    setDisclaimerChecked(false)
    setShowDisclaimer(true)
  }

  function handleDisclaimerConfirm() {
    setShowDisclaimer(false)
    onSelect('EXERCISE')
  }

  return (
    <div>
      <h2 className="text-[22px] font-semibold text-foreground mb-6">What are you sharing?</h2>
      <div className="flex flex-col gap-3">
        <button
          onClick={() => onSelect('NOTE')}
          className={cn(
            'relative flex items-center gap-4 w-full border-2 rounded-[6px] p-5 text-left transition-all duration-150',
            postType === 'NOTE' ? 'border-amber bg-amber-subtle' : 'border-border hover:bg-muted',
          )}
        >
          {postType === 'NOTE' && (
            <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-amber flex items-center justify-center">
              <Check className="size-3 text-primary-foreground" strokeWidth={2.5} />
            </span>
          )}
          <div
            className={cn(
              'w-10 h-10 rounded-[6px] flex items-center justify-center shrink-0',
              postType === 'NOTE' ? 'bg-amber/20' : 'bg-muted',
            )}
          >
            <FileText
              className={cn('size-5', postType === 'NOTE' ? 'text-amber' : 'text-text-muted')}
              strokeWidth={1.5}
            />
          </div>
          <div>
            <p className="text-base font-medium text-foreground">Lecture Note</p>
            <p className="text-[13px] text-text-muted mt-0.5">
              Summaries, slides, or personal notes
            </p>
          </div>
        </button>
        <button
          disabled
          className="relative flex items-center gap-4 w-full border-2 rounded-[6px] p-5 text-left border-border opacity-50 cursor-not-allowed"
        >
          <span className="absolute top-3 right-3 text-[10px] font-medium text-text-muted bg-muted px-1.5 py-0.5 rounded">
            Unavailable
          </span>
          <div className="w-10 h-10 rounded-[6px] flex items-center justify-center shrink-0 bg-muted">
            <GraduationCap className="size-5 text-text-muted" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-base font-medium text-foreground">Past Exam</p>
            <p className="text-[13px] text-text-muted mt-0.5">Old exam papers and question banks</p>
          </div>
        </button>
        <button
          onClick={handleExerciseClick}
          className={cn(
            'relative flex items-center gap-4 w-full border-2 rounded-[6px] p-5 text-left transition-all duration-150',
            postType === 'EXERCISE'
              ? 'border-amber bg-amber-subtle'
              : 'border-border hover:bg-muted',
          )}
        >
          {postType === 'EXERCISE' && (
            <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-amber flex items-center justify-center">
              <Check className="size-3 text-primary-foreground" strokeWidth={2.5} />
            </span>
          )}
          <div
            className={cn(
              'w-10 h-10 rounded-[6px] flex items-center justify-center shrink-0',
              postType === 'EXERCISE' ? 'bg-amber/20' : 'bg-muted',
            )}
          >
            <ClipboardList
              className={cn('size-5', postType === 'EXERCISE' ? 'text-amber' : 'text-text-muted')}
              strokeWidth={1.5}
            />
          </div>
          <div>
            <p className="text-base font-medium text-foreground">Exercise</p>
            <p className="text-[13px] text-text-muted mt-0.5">
              Practice worksheets and problem sets
            </p>
          </div>
        </button>
      </div>

      <AlertDialog open={showDisclaimer} onOpenChange={setShowDisclaimer}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber shrink-0" />
              Academic Integrity Notice
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-sm text-text-secondary leading-relaxed space-y-3">
                <p>
                  Sharing graded assignments, homework submissions, or coursework that is currently
                  in use may violate your institution&apos;s academic integrity policy and could
                  result in disciplinary action.
                </p>
                <p>
                  This category is intended for{' '}
                  <strong className="text-foreground">practice worksheets</strong>,{' '}
                  <strong className="text-foreground">problem sets</strong>, and materials that are
                  no longer actively graded.
                </p>
                <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 shrink-0 accent-foreground cursor-pointer"
                    checked={disclaimerChecked}
                    onChange={(e) => setDisclaimerChecked(e.target.checked)}
                  />
                  <span className="text-foreground font-medium text-[13px]">
                    I confirm this is not an active graded assignment or homework submission, and I
                    have the right to share this material.
                  </span>
                </label>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button onClick={handleDisclaimerConfirm} disabled={!disclaimerChecked}>
              Continue
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
