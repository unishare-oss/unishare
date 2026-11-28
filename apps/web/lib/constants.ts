import { ThumbsUp, Heart, Flame, Zap, Star, Skull } from 'lucide-react'

/** The demo's `.act` pill: reactions, comments, save and report in the post action row. */
export const ACTION_PILL =
  'inline-flex select-none items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium tabular-nums text-muted-foreground transition-colors duration-150 hover:bg-surface-2 hover:text-ink'

/** `pressed` is the text colour once the reaction is on; the demo gives pressed pills no background. */
export const REACTIONS = [
  {
    type: 'HELPFUL',
    icon: ThumbsUp,
    label: 'Helpful',
    pressed: 'text-bad',
  },
  {
    type: 'LOVE',
    icon: Heart,
    label: 'Love',
    pressed: 'text-rose-400',
  },
  {
    type: 'FIRE',
    icon: Flame,
    label: 'Fire',
    pressed: 'text-orange-400',
  },
  {
    type: 'WOW',
    icon: Zap,
    label: 'Wow',
    pressed: 'text-yellow-400',
  },
  {
    type: 'SALUTE',
    icon: Star,
    label: 'Salute',
    pressed: 'text-violet-400',
  },
  {
    type: 'FUNNY',
    icon: Skull,
    label: 'Funny',
    pressed: 'text-emerald-400',
  },
] as const
