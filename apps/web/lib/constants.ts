import { ThumbsUp, Heart, Flame, Zap, Star, Skull } from 'lucide-react'

export const REACTIONS = [
  {
    type: 'HELPFUL',
    icon: ThumbsUp,
    label: 'Helpful',
    color: 'text-sky-400 group-hover:text-sky-300',
    activeBg: 'bg-sky-500/10 border-sky-500/50',
  },
  {
    type: 'LOVE',
    icon: Heart,
    label: 'Love',
    color: 'text-rose-400 group-hover:text-rose-300',
    activeBg: 'bg-rose-500/10 border-rose-500/50',
  },
  {
    type: 'FIRE',
    icon: Flame,
    label: 'Fire',
    color: 'text-orange-400 group-hover:text-orange-300',
    activeBg: 'bg-orange-500/10 border-orange-500/50',
  },
  {
    type: 'WOW',
    icon: Zap,
    label: 'Wow',
    color: 'text-yellow-400 group-hover:text-yellow-300',
    activeBg: 'bg-yellow-500/10 border-yellow-500/50',
  },
  {
    type: 'SALUTE',
    icon: Star,
    label: 'Salute',
    color: 'text-violet-400 group-hover:text-violet-300',
    activeBg: 'bg-violet-500/10 border-violet-500/50',
  },
  {
    type: 'FUNNY',
    icon: Skull,
    label: 'Funny',
    color: 'text-emerald-400 group-hover:text-emerald-300',
    activeBg: 'bg-emerald-500/10 border-emerald-500/50',
  },
] as const
