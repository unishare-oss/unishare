import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const shareInputClass =
  'w-full rounded-(--r-s) border-[1.5px] border-line bg-surface px-3 py-2.5 text-[15px] outline-none transition-[border-color] duration-160 focus:border-sky aria-invalid:border-bad'

export function Chip({
  pressed,
  expanded,
  locked,
  title,
  onClick,
  onFocus,
  onPointerDown,
  children,
}: {
  pressed: boolean
  expanded?: boolean
  locked?: boolean
  title?: string
  onClick: () => void
  onFocus?: () => void
  onPointerDown?: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-expanded={expanded}
      aria-disabled={locked || undefined}
      title={title}
      onClick={onClick}
      onFocus={onFocus}
      onPointerDown={onPointerDown}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-3.5 py-1.5 text-sm font-medium transition-[background-color,color,border-color,transform] duration-160 active:scale-[0.97]',
        locked
          ? 'pointer-events-auto cursor-not-allowed border-line bg-surface-2 text-muted-foreground opacity-70'
          : pressed
            ? 'border-ink bg-ink text-bg'
            : 'border-line bg-surface text-muted-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:border-muted-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}
