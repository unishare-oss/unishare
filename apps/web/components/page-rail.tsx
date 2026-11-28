import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** The demo's page frame: a main column and a right rail that drops below it on narrow screens. */
export function PageRail({ children, rail }: { children: ReactNode; rail?: ReactNode }) {
  return (
    <div
      className={cn(
        'mx-auto grid w-full max-w-[1056px] grid-cols-[minmax(0,1fr)] gap-7',
        // A rail that renders nothing leaves its aside empty: hide it and give the column the width.
        rail &&
          'min-[1181px]:grid-cols-[minmax(0,1fr)_320px] min-[1181px]:has-[>aside:empty]:grid-cols-1',
      )}
    >
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-[22px] md:pt-[22px]">
        {children}
      </div>
      {rail && (
        <aside
          aria-label="Side panel"
          className="grid min-w-0 content-start items-start gap-4 empty:hidden min-[761px]:max-[1180px]:grid-cols-2 min-[1181px]:sticky min-[1181px]:top-0 min-[1181px]:pt-[22px]"
        >
          {rail}
        </aside>
      )}
    </div>
  )
}
