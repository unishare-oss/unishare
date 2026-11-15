import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { signInWithUniauth } from '@/src/lib/auth/uniauth'

export const countLabel = (count: number) => (count > 99 ? '99+' : String(count))

/** Straight to uniauth: /login sends anyone with a session (a guest's too) away. */
export function startSignIn() {
  signInWithUniauth({ returnTo: window.location.href }).catch(() =>
    toast.error('Could not start sign-in. Please try again.'),
  )
}

export function UnreadBadge({ count, className }: { count: number; className?: string }) {
  if (!count) return null
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1.5 text-[11px] leading-none font-bold text-on-brand tabular-nums',
        className,
      )}
    >
      {countLabel(count)}
    </span>
  )
}
