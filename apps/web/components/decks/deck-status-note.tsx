'use client'

import { cn } from '@/lib/utils'
import type { DeckWaitState } from '@/lib/decks/waiting-state'

/**
 * The house async-work box. One component so the four waiting states differ only in the
 * words and the icon, never in the shape of the thing they are printed in.
 */
export function DeckStatusNote({ state, className }: { state: DeckWaitState; className?: string }) {
  const Icon = state.icon
  const warning = state.tone === 'warning'

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-start gap-2 rounded-md border px-3 py-2 text-xs leading-relaxed',
        warning
          ? 'border-amber/40 bg-amber-subtle text-foreground'
          : 'border-border bg-muted text-text-muted',
        className,
      )}
    >
      <Icon
        className={cn(
          'size-3.5 shrink-0 mt-0.5',
          state.spin && 'animate-spin motion-reduce:animate-none',
          warning && 'text-amber',
        )}
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <span className="min-w-0">
        <span className="block">{state.message}</span>
        {state.detail && (
          <span className={cn('block mt-0.5', warning ? 'text-text-muted' : 'text-text-muted/80')}>
            {state.detail}
          </span>
        )}
      </span>
    </div>
  )
}
