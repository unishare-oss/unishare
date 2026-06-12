import type { LucideIcon } from 'lucide-react'
import { Sparkles } from 'lucide-react'

interface EmptyStateProps {
  message: string
  description?: string
  icon?: LucideIcon
}

export function EmptyState({ message, description, icon: Icon = Sparkles }: EmptyStateProps) {
  return (
    <div className="py-20 text-center px-4 flex flex-col items-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
        <Icon className="size-7 text-primary" strokeWidth={1.75} />
      </div>
      <p className="text-base font-bold text-foreground">{message}</p>
      <p className="text-sm text-text-muted mt-1.5 max-w-xs text-balance">
        {description ?? 'Nothing here yet — be the first to add something!'}
      </p>
    </div>
  )
}
