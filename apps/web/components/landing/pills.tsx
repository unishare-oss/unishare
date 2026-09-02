export function BadgePill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border-2 border-border-strong bg-card px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest shadow-[2px_2px_0_0_var(--shadow-color)]">
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
      className={`flex items-center gap-2 whitespace-nowrap rounded-full border-2 px-4 py-2 text-sm font-bold shadow-[2px_2px_0_0_var(--shadow-color)] transition hover:translate-y-px hover:shadow-[1px_1px_0_0_var(--shadow-color)] ${
        active
          ? 'border-border-strong bg-primary text-primary-foreground'
          : 'border-border-strong bg-card'
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
