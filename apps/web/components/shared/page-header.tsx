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
      <div className="flex items-center justify-between">
        <div>
          <h1
            className={
              large
                ? 'text-[22px] font-semibold text-foreground'
                : 'text-lg font-semibold text-foreground'
            }
          >
            {title}
          </h1>
          {subtitle && <p className="font-mono text-[13px] text-text-muted mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
    </header>
  )
}
