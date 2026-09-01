import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  large?: boolean
  action?: ReactNode
}

export function PageHeader({ title, subtitle, large, action }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-20 bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between gap-3">
        {/* min-w-0 + truncate so a long dynamic title (a generated deck's, say) shortens
            instead of wrapping and growing this sticky bar. Short literal titles are
            unaffected. */}
        <div className="min-w-0">
          <h1
            className={
              large
                ? 'text-[22px] font-extrabold tracking-tight text-foreground truncate'
                : 'text-lg font-extrabold tracking-tight text-foreground truncate'
            }
          >
            {title}
          </h1>
          {/* The subtitle keeps wrapping — it is the line most likely to carry a count or a
              state a reader would miss if it were clipped. */}
          {subtitle && <p className="font-mono text-[13px] text-text-muted mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  )
}
