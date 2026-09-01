'use client'

import { useFormContext } from 'react-hook-form'
import { AlertCircle, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useDecksControllerListTemplates } from '@/src/lib/api/generated/decks/decks'
import type { DeckFormValues } from '@/components/decks/deck-form-schema'

function TemplateSkeleton() {
  return (
    <div className="card-pop rounded-xl bg-card p-3 space-y-2" aria-hidden="true">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  )
}

/**
 * Reads the form from context rather than taking value/onChange, so the create form stays a
 * single source of truth and this file never has to know how it is being submitted.
 */
export function TemplatePicker({ disabled }: { disabled?: boolean }) {
  const form = useFormContext<DeckFormValues>()
  const {
    data: templates,
    isLoading,
    isError,
  } = useDecksControllerListTemplates({
    query: {
      select: (r) => r.data,
      // Templates change only when the generator is upgraded.
      staleTime: 60 * 60 * 1000,
    },
  })

  return (
    <FormField
      control={form.control}
      name="template"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
            Template{' '}
            {!field.value && <span className="normal-case tracking-normal">— optional</span>}
          </FormLabel>

          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <TemplateSkeleton />
              <TemplateSkeleton />
              <TemplateSkeleton />
            </div>
          )}

          {isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Templates could not be loaded — the deck service may be unreachable. Your deck will
                use the default look.
              </AlertDescription>
            </Alert>
          )}

          {!isLoading && !isError && templates && templates.length > 0 && (
            <FormControl>
              <div
                role="group"
                aria-label="Template"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {templates.map((template) => {
                  const selected = template.id === field.value
                  return (
                    <button
                      key={template.id}
                      type="button"
                      // A toggle rather than role="radio": a real radiogroup owes the user
                      // arrow-key navigation with a roving tabindex, and claiming the role
                      // without it is worse for a screen reader than not claiming it.
                      aria-pressed={selected}
                      disabled={disabled}
                      onClick={() => field.onChange(template.id)}
                      className={cn(
                        'card-pop card-pop-hover relative rounded-xl p-3 text-left disabled:opacity-50 disabled:pointer-events-none',
                        selected ? 'bg-accent' : 'bg-card hover:bg-accent',
                      )}
                    >
                      {selected && (
                        <Check
                          className="absolute right-3 top-3 size-4 text-primary"
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                      )}
                      <p className="pr-6 text-sm font-semibold text-foreground">{template.name}</p>
                      {template.description && (
                        <p className="mt-1 line-clamp-3 text-xs text-text-muted">
                          {template.description}
                        </p>
                      )}
                    </button>
                  )
                })}
              </div>
            </FormControl>
          )}

          {!isLoading && !isError && !field.value && (
            <p className="text-xs text-text-muted mt-1.5">
              Nothing picked — the generator will use its standard look.
            </p>
          )}

          <FormMessage className="text-xs" />
        </FormItem>
      )}
    />
  )
}
