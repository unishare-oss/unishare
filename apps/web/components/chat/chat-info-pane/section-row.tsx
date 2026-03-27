'use client'

import { ChevronRight } from 'lucide-react'

export function SectionRow({
  icon: Icon,
  label,
  count,
  preview,
  onClick,
}: {
  icon: React.ElementType
  label: string
  count?: number
  preview?: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full px-4 py-3 hover:bg-muted/60 transition-colors text-left group"
    >
      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted shrink-0">
        <Icon className="size-4 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium">{label}</span>
        {preview && <div className="mt-1">{preview}</div>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {count !== undefined && count > 0 && (
          <span className="text-xs text-muted-foreground">{count}</span>
        )}
        <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
    </button>
  )
}
