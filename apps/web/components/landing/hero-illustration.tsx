import { FileText, Heart, MessageCircle, Search, Sparkles, Users } from 'lucide-react'

export function HeroIllustration() {
  return (
    <div className="relative mx-auto aspect-[1.05] w-full max-w-[520px] lg:mx-0">
      <div className="absolute inset-0 -z-10 rounded-[32px] bg-amber-subtle blur-2xl opacity-60" />

      <div className="absolute left-[8%] top-[6%] h-[72%] w-[68%] rotate-[-8deg] rounded-2xl border-2 border-border-strong bg-card p-4 shadow-[6px_6px_0_0_var(--shadow-color)]">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-type-exercise px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-white">
            Exercise
          </span>
          <span className="font-mono text-[10px] text-text-muted">CS-204 • Year 2</span>
        </div>
        <div className="mt-3 space-y-2">
          <div className="h-2.5 w-3/4 rounded-full bg-foreground/10" />
          <div className="h-2 w-full rounded-full bg-foreground/[0.06]" />
          <div className="h-2 w-5/6 rounded-full bg-foreground/[0.06]" />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="h-16 rounded-xl border border-border bg-muted p-2">
              <div className="h-1.5 w-10 rounded bg-foreground/15" />
              <div className="mt-2 h-1 w-full rounded bg-foreground/10" />
              <div className="mt-1 h-1 w-3/4 rounded bg-foreground/10" />
            </div>
            <div className="h-16 rounded-xl border border-border bg-muted p-2">
              <div className="h-1.5 w-8 rounded bg-foreground/15" />
              <div className="mt-2 h-1 w-full rounded bg-foreground/10" />
              <div className="mt-1 h-1 w-2/3 rounded bg-foreground/10" />
            </div>
          </div>
        </div>
        <div className="desk-tape bg-amber/70" style={{ ['--tape-tilt' as string]: '3deg' }} />
      </div>

      <div className="absolute left-[18%] top-[18%] h-[70%] w-[68%] rotate-[4deg] rounded-2xl border-2 border-border-strong bg-card p-4 shadow-[6px_6px_0_0_var(--shadow-color)]">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-type-exam px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-white">
            Past paper
          </span>
          <span className="font-mono text-[10px] text-text-muted">MED-301 • 2023</span>
        </div>
        <div className="mt-3">
          <p className="font-mono text-xs font-bold">Midterm — Pathology</p>
          <div className="mt-3 space-y-1.5">
            <div className="flex gap-2">
              <span className="flex size-5 items-center justify-center rounded-full border border-border bg-accent font-mono text-[10px] font-bold">
                1
              </span>
              <div className="h-1.5 flex-1 self-center rounded bg-foreground/10" />
            </div>
            <div className="flex gap-2">
              <span className="flex size-5 items-center justify-center rounded-full border border-border bg-accent font-mono text-[10px] font-bold">
                2
              </span>
              <div className="h-1.5 flex-1 self-center rounded bg-foreground/10" />
            </div>
            <div className="flex gap-2">
              <span className="flex size-5 items-center justify-center rounded-full border border-border bg-amber font-mono text-[10px] font-bold text-white">
                3
              </span>
              <div className="h-1.5 flex-1 self-center rounded bg-foreground/10" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-amber-subtle px-3 py-2 hidden md:block">
            <div className="flex size-7 items-center justify-center rounded-full bg-amber text-white">
              <Sparkles className="size-3.5" />
            </div>
            <p className="text-xs font-bold leading-tight">
              24 solves • 4.8★ <span className="font-normal text-text-secondary">avg. helpful</span>
            </p>
          </div>
        </div>
      </div>

      <div className="absolute left-[28%] top-[4%] h-[76%] w-[70%] rotate-[-1deg] rounded-2xl border-2 border-border-strong bg-card p-5 shadow-[8px_8px_0_0_var(--shadow-color)]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-type-note px-2.5 py-1 font-mono text-[10px] font-bold uppercase text-white">
              Note
            </span>
            <span className="hidden font-mono text-[11px] font-medium text-text-muted sm:inline">
              CS-101 • L12
            </span>
          </div>
        </div>
        <h4 className="mt-3 text-sm font-black leading-tight">
          Data Structures — Trees & Traversals
        </h4>
        <p className="mt-1 font-mono text-[11px] text-text-muted">
          by Aisha K. • 2nd year • 1.2k views
        </p>
        <div className="mt-3 space-y-2">
          <div className="h-2 w-full rounded-full bg-foreground/10" />
          <div className="h-2 w-[92%] rounded-full bg-foreground/[0.07]" />
          <div className="h-2 w-[84%] rounded-full bg-foreground/[0.07]" />
          <div className="mt-3 rounded-xl border border-dashed border-border bg-muted/60 p-2.5 hidden md:block">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-text-muted" />
              <div className="h-1.5 flex-1 rounded bg-foreground/10" />
              <span className="rounded bg-card px-1.5 py-0.5 font-mono text-[10px] font-bold">
                PDF
              </span>
            </div>
            <div className="mt-2 flex gap-1.5">
              <div className="h-1 w-12 rounded bg-amber" />
              <div className="h-1 flex-1 rounded bg-foreground/10" />
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className='hidden md:block'>
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-xs font-bold shadow-[1px_1px_0_0_var(--shadow-color)]">
                <Heart className="size-3 fill-amber text-amber" /> 86
              </span>
              <span className="flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-xs font-bold shadow-[1px_1px_0_0_var(--shadow-color)]">
                <MessageCircle className="size-3" /> 12
              </span>
              </div>
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-text-muted">
              18 saves
            </span>
          </div>
        </div>
        <div className="desk-tape bg-amber" style={{ ['--tape-tilt' as string]: '-2deg' }} />
      </div>

      <div className="absolute -left-2 bottom-[14%] hidden items-center gap-2 rounded-2xl border-2 border-border-strong bg-card px-3 py-2 shadow-[4px_4px_0_0_var(--shadow-color)] sm:flex">
        <div className="flex size-8 items-center justify-center rounded-xl bg-success text-white">
          <Search className="size-4" />
        </div>
        <div>
          <p className="text-xs font-black leading-none">Find in seconds</p>
          <p className="font-mono text-[10px] text-text-muted">by course, tag, year</p>
        </div>
      </div>
      <div className="absolute -right-2 top-[52%] hidden items-center gap-2 rounded-2xl border-2 border-border-strong bg-card px-3 py-2 shadow-[4px_4px_0_0_var(--shadow-color)] sm:flex">
        <div className="flex size-8 items-center justify-center rounded-xl bg-info text-white">
          <Users className="size-4" />
        </div>
        <div>
          <p className="text-xs font-black leading-none">3 departments</p>
          <p className="font-mono text-[10px] text-text-muted">one shared feed</p>
        </div>
      </div>
    </div>
  )
}
