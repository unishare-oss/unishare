'use client'

import { FileText, GraduationCap, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TypeStepProps {
  postType: 'NOTE' | 'PAST EXAM' | null
  onSelect: (type: 'NOTE' | 'PAST EXAM') => void
}

export function TypeStep({ postType, onSelect }: TypeStepProps) {
  return (
    <div>
      <h2 className="text-[22px] font-semibold text-foreground mb-6">What are you sharing?</h2>
      <div className="flex flex-col gap-3">
        <button
          onClick={() => onSelect('NOTE')}
          className={cn(
            'relative flex items-center gap-4 w-full border rounded-[6px] p-5 text-left transition-all duration-150',
            postType === 'NOTE'
              ? 'border-amber border-[1.5px] bg-amber-subtle'
              : 'border-border hover:bg-muted',
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
          onClick={() => onSelect('PAST EXAM')}
          className={cn(
            'relative flex items-center gap-4 w-full border rounded-[6px] p-5 text-left transition-all duration-150',
            postType === 'PAST EXAM'
              ? 'border-amber border-[1.5px] bg-amber-subtle'
              : 'border-border hover:bg-muted',
          )}
        >
          {postType === 'PAST EXAM' && (
            <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-amber flex items-center justify-center">
              <Check className="size-3 text-primary-foreground" strokeWidth={2.5} />
            </span>
          )}
          <div
            className={cn(
              'w-10 h-10 rounded-[6px] flex items-center justify-center shrink-0',
              postType === 'PAST EXAM' ? 'bg-amber/20' : 'bg-muted',
            )}
          >
            <GraduationCap
              className={cn('size-5', postType === 'PAST EXAM' ? 'text-amber' : 'text-text-muted')}
              strokeWidth={1.5}
            />
          </div>
          <div>
            <p className="text-base font-medium text-foreground">Past Exam</p>
            <p className="text-[13px] text-text-muted mt-0.5">Old exam papers and question banks</p>
          </div>
        </button>
      </div>
    </div>
  )
}
