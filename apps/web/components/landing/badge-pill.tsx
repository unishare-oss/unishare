export function BadgePill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border-2 border-border-strong bg-card px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest shadow-[2px_2px_0_0_var(--shadow-color)]">
      <span className="size-2 rounded-full bg-success animate-pulse" />
      {children}
    </span>
  )
}
