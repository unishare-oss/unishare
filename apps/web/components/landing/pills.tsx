export function BadgePill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border-2 border-border bg-card px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest">
      <span className="size-2 rounded-full bg-success animate-pulse" />
      {children}
    </span>
  )
}

type DepartmentPillProps = {
  name: string
  count: string
  active?: boolean
}

export function DepartmentPill({ name, count, active }: DepartmentPillProps) {
  return (
    <div
      className={`flex items-center gap-2 whitespace-nowrap rounded-full border-2 px-4 py-2 text-sm font-bold transition hover:translate-y-px ${
        active ? 'border-border bg-primary text-primary-foreground' : 'border-border bg-card'
      }`}
    >
      <span className={`size-2 rounded-full ${active ? 'bg-white' : 'bg-amber'}`} />
      {name}
      <span
        className={`font-mono text-xs ${active ? 'text-primary-foreground/80' : 'text-text-muted'}`}
      >
        {count}
      </span>
    </div>
  )
}
