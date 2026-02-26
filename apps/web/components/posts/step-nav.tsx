'use client'

import { cn } from '@/lib/utils'

interface StepNavProps {
  currentStep: number
  totalSteps: number
  canProceed: boolean
  onBack: () => void
  onNext: () => void
}

export function StepNav({ currentStep, totalSteps, canProceed, onBack, onNext }: StepNavProps) {
  return (
    <div className="flex items-center justify-between mt-10 pt-6 border-t border-border">
      <button
        onClick={onBack}
        disabled={currentStep === 0}
        className={cn(
          'h-9 px-4 text-sm font-medium rounded-[6px] transition-colors duration-150',
          currentStep === 0
            ? 'text-text-muted cursor-not-allowed'
            : 'text-foreground hover:bg-muted',
        )}
      >
        Back
      </button>
      <button
        onClick={onNext}
        disabled={!canProceed}
        className={cn(
          'h-9 px-6 text-sm font-medium rounded-[6px] transition-colors duration-150',
          canProceed
            ? 'bg-amber text-primary-foreground hover:bg-amber-hover'
            : 'bg-muted text-text-muted cursor-not-allowed',
        )}
      >
        {currentStep === totalSteps - 1 ? 'Submit' : 'Next'}
      </button>
    </div>
  )
}
