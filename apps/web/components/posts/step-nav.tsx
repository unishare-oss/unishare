'use client'

import { cn } from '@/lib/utils'

interface StepNavProps {
  currentStep: number
  totalSteps: number
  canProceed: boolean
  loading?: boolean
  onBack: () => void
  onNext: () => void
}

export function StepNav({
  currentStep,
  totalSteps,
  canProceed,
  loading,
  onBack,
  onNext,
}: StepNavProps) {
  const isLastStep = currentStep === totalSteps - 1
  const disabled = !canProceed || loading

  return (
    <div className="flex items-center justify-between mt-10 pt-6 border-t border-border">
      <button
        onClick={onBack}
        disabled={currentStep === 0 || loading}
        className={cn(
          'h-9 px-4 text-sm font-medium rounded-[6px] transition-colors duration-150',
          currentStep === 0 || loading
            ? 'text-text-muted cursor-not-allowed'
            : 'text-foreground hover:bg-muted',
        )}
      >
        Back
      </button>
      <button
        onClick={onNext}
        disabled={disabled}
        className={cn(
          'h-9 px-6 text-sm font-medium rounded-[6px] transition-colors duration-150',
          disabled
            ? 'bg-muted text-text-muted cursor-not-allowed'
            : 'bg-amber text-primary-foreground hover:bg-amber-hover',
        )}
      >
        {loading ? 'Submitting...' : isLastStep ? 'Submit' : 'Next'}
      </button>
    </div>
  )
}
