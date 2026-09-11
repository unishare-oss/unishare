import Link from 'next/link'
import { ArrowRight, Clock, Sparkles, UploadCloud, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function LandingCta() {
  return (
    <section className="mx-auto max-w-[1200px] px-4 pb-14 sm:px-6 sm:pb-16 pt-14">
      <div className="relative overflow-hidden rounded-[24px] border-2 border-border-strong bg-card p-6 shadow-[8px_8px_0_0_var(--shadow-color)] sm:p-10">
        <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-amber-subtle blur-2xl opacity-50" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 size-64 rounded-full bg-info/10 blur-2xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-amber-subtle px-3 py-1 font-mono text-xs font-bold">
              <Sparkles className="size-3.5" /> New semester? Start sharing today
            </p>
            <h2 className="mt-4 text-balance text-3xl font-black leading-tight tracking-tight sm:text-4xl">
              Your cohort knows more than any syllabus.
            </h2>
            <p className="mt-3 max-w-[55ch] text-sm leading-relaxed text-text-secondary">
              Join Unishare, find your department, and pick up where someone just like you left off
              — or leave the notes you wish you’d had.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 rounded-full px-7 text-sm font-black">
                <Link href="/login">
                  Create your account <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 rounded-full bg-card px-7 font-bold"
              >
                <Link href="/feed">Continue as guest</Link>
              </Button>
            </div>
            <p className="mt-3 font-mono text-xs text-text-muted">
              Free forever for students • Open source • Takes 30 seconds
            </p>
          </div>
          <div className="grid gap-3">
            <div className="flex items-center gap-3 rounded-2xl border-2 border-border bg-muted p-4">
              <div className="flex size-10 items-center justify-center rounded-xl bg-card border-2 border-border-strong shadow-[2px_2px_0_0_var(--shadow-color)]">
                <UploadCloud className="size-5" />
              </div>
              <div>
                <p className="text-sm font-black">Upload in 20 seconds</p>
                <p className="font-mono text-xs text-text-muted">
                  PDF, slides or docs — we handle the rest
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border-2 border-border bg-muted p-4">
              <div className="flex size-10 items-center justify-center rounded-xl bg-card border-2 border-border-strong shadow-[2px_2px_0_0_var(--shadow-color)]">
                <Zap className="size-5 text-amber" />
              </div>
              <div>
                <p className="text-sm font-black">Find in 10 seconds</p>
                <p className="font-mono text-xs text-text-muted">Filter by course, year, tags</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border-2 border-border bg-muted p-4">
              <div className="flex size-10 items-center justify-center rounded-xl bg-card border-2 border-border-strong shadow-[2px_2px_0_0_var(--shadow-color)]">
                <Clock className="size-5 text-success" />
              </div>
              <div>
                <p className="text-sm font-black">Stay in sync</p>
                <p className="font-mono text-xs text-text-muted">
                  Boards & chat, live with your cohort
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
