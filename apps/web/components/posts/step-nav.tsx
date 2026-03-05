'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

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
      <Button
        variant="ghost"
        onClick={onBack}
        disabled={currentStep === 0 || loading}
        className="text-text-muted disabled:text-text-muted disabled:opacity-100"
      >
        Back
      </Button>
      <Button
        onClick={onNext}
        disabled={disabled}
        className={cn(
          disabled
            ? 'bg-muted text-text-muted hover:bg-muted'
            : 'bg-amber text-primary-foreground hover:bg-amber-hover',
        )}
      >
        {loading ? 'Submitting...' : isLastStep ? 'Submit' : 'Next'}
      </Button>
    </div>
  )
}
