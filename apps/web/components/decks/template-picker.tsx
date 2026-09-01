'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDecksControllerListTemplates } from '@/src/lib/api/generated/decks/decks'

interface TemplatePickerProps {
  value: string
  onChange: (id: string) => void
  disabled?: boolean
}

export function TemplatePicker({ value, onChange, disabled }: TemplatePickerProps) {
  const { data: templates, isLoading } = useDecksControllerListTemplates({
    query: {
      select: (r) => r.data,
      // Templates change only when the generator is upgraded.
      staleTime: 60 * 60 * 1000,
    },
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg border border-border bg-muted/40" />
        ))}
      </div>
    )
  }

  if (!templates?.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No templates available — the deck service may be unreachable.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {templates.map((template) => {
        const selected = template.id === value
        return (
          <button
            key={template.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(template.id)}
            className={cn(
              'relative rounded-lg border p-3 text-left transition-colors disabled:opacity-50',
              selected
                ? 'border-primary bg-primary/5'
                : 'border-border bg-card hover:border-primary/50',
            )}
          >
            {selected && (
              <Check className="absolute right-2 top-2 size-4 text-primary" aria-hidden />
            )}
            <p className="pr-5 text-sm font-medium text-foreground">{template.name}</p>
            {template.description && (
              <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
                {template.description}
              </p>
            )}
          </button>
        )
      })}
    </div>
  )
}
