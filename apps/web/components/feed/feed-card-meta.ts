import { Flame, Heart, NotebookPen, ScrollText, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface TypeMeta {
  label: string
  icon: LucideIcon
  reactionIcon: LucideIcon
  /** text color for the type */
  text: string
  /** soft type-tinted background */
  softBg: string
  /** border tinted with the type color */
  border: string
}

export const TYPE_META: Record<string, TypeMeta> = {
  NOTE: {
    label: 'note',
    icon: NotebookPen,
    reactionIcon: Heart,
    text: 'text-type-note',
    softBg: 'bg-type-note/15',
    border: 'border-type-note',
  },
  OLD_QUESTION: {
    label: 'past exam',
    icon: ScrollText,
    reactionIcon: Flame,
    text: 'text-type-exam',
    softBg: 'bg-type-exam/15',
    border: 'border-type-exam',
  },
  EXERCISE: {
    label: 'exercise',
    icon: Zap,
    reactionIcon: Flame,
    text: 'text-type-exercise',
    softBg: 'bg-type-exercise/15',
    border: 'border-type-exercise',
  },
}

export const FALLBACK_TYPE_META: TypeMeta = TYPE_META.NOTE

export function getTypeMeta(type: string): TypeMeta {
  return TYPE_META[type] ?? FALLBACK_TYPE_META
}

/** Sum all reaction counts on a post (reactionCounts is a loose string map). */
export function sumReactions(counts: Record<string, unknown> | undefined | null): number {
  if (!counts) return 0
  return Object.values(counts).reduce<number>((acc, v) => acc + (typeof v === 'number' ? v : 0), 0)
}
