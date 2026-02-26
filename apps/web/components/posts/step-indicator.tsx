import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StepIndicatorProps {
  steps: readonly string[]
  currentStep: number
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-3 mb-10">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono font-medium',
                i <= currentStep ? 'bg-amber text-primary-foreground' : 'bg-muted text-text-muted',
              )}
            >
              {i < currentStep ? <Check className="size-3.5" strokeWidth={2} /> : i + 1}
            </div>
            <span
              className={cn(
                'font-mono text-xs uppercase tracking-wider hidden sm:inline',
                i === currentStep
                  ? 'text-amber font-medium'
                  : i < currentStep
                    ? 'text-foreground'
                    : 'text-text-muted',
              )}
            >
              {step}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={cn('w-8 h-px', i < currentStep ? 'bg-amber' : 'bg-border')} />
          )}
        </div>
      ))}
    </div>
  )
}
