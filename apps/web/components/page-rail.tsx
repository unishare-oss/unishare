import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Two columns from 1180px: the page on the left, a 320px rail on the right.
 * Below 1180px the rail moves under the page.
 */
export function PageRail({
  children,
  rail,
  className,
}: {
  children: ReactNode
  rail: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'min-[1180px]:grid min-[1180px]:grid-cols-[minmax(0,1fr)_320px] min-[1180px]:items-start min-[1180px]:gap-8',
        className,
      )}
    >
      <div className="min-w-0">{children}</div>
      <aside aria-label="Page details" className="mt-8 min-w-0 min-[1180px]:mt-0">
        {rail}
      </aside>
    </div>
  )
}
