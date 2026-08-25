import Link from 'next/link'
import { ArrowRight, Check, Play, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BadgePill } from './badge-pill'
import { DepartmentPill } from './department-pill'
import { GithubIcon } from './github-icon'
import { HeroIllustration } from './hero-illustration'

export function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.035]"
        style={{
          backgroundImage:
            'linear-gradient(var(--border-strong) 1px, transparent 1px), linear-gradient(90deg, var(--border-strong) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      <div className="pointer-events-none absolute -top-24 right-0 -z-10 h-[520px] w-[520px] rounded-full bg-amber-subtle blur-[90px] opacity-60" />

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <div className="grid items-center gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6 lg:py-16">
          <div className="max-w-[620px]">
            <div className="flex flex-wrap items-center gap-2">
              <BadgePill>Open-source • Self-hostable</BadgePill>
              <Link
                href="/changelog"
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 font-mono text-[11px] font-bold hover:bg-accent"
              >
                <span className="size-1.5 rounded-full bg-amber" /> What&apos;s new{' '}
                <ArrowRight className="size-3" />
              </Link>
            </div>

            <h1 className="mt-6 text-balance text-4xl font-black leading-[0.95] tracking-tight sm:text-5xl lg:text-[52px]">
              More than just
              <br />
              <span className="hand-underline">a file drive</span>
              <br />
              for your cohort.
            </h1>

            <p className="mt-4 max-w-[560px] text-base leading-relaxed text-text-secondary sm:text-[17px]">
              Every lecture note, past paper and exercise —{' '}
              <span className="font-bold text-foreground">
                shared by students who&apos;ve been there
              </span>
              . Organized by department, course and year. Enriched by chat, boards and quizzes.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-full px-7 text-[15px] font-black shadow-[3px_3px_0_0_var(--shadow-color)]"
              >
                <Link href="/login">
                  Get started — free <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 rounded-full bg-card px-7 text-[15px] font-bold"
              >
                <Link href="/feed" className="gap-2">
                  <Play className="size-4" /> Browse as guest
                </Link>
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-success" /> Free for students
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-success" /> No credit card
              </span>
              <span className="inline-flex items-center gap-1.5">
                <GithubIcon className="size-3.5" /> MIT licensed
              </span>
            </div>
          </div>

          <div className="relative lg:pl-4">
            <HeroIllustration />
            <div className="mx-auto mt-4 flex max-w-[520px] items-center gap-2 rounded-2xl border-2 border-border-strong bg-card p-2 shadow-[4px_4px_0_0_var(--shadow-color)] lg:hidden">
              <div className="flex flex-1 items-center gap-2 rounded-xl bg-muted px-3 py-2.5">
                <Search className="size-4 text-text-muted" />
                <span className="text-sm text-text-muted">Search “trees traversal”...</span>
              </div>
              <span className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">
                Search
              </span>
            </div>
          </div>
        </div>

        <div className="border-y border-border bg-card/60 py-6 backdrop-blur">
          <p className="text-center font-mono text-[11px] font-bold uppercase tracking-widest text-text-muted">
            Organized the way your university actually works
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2.5">
            <DepartmentPill name="Computer Science" count="412" active />
            <DepartmentPill name="Medicine" count="389" />
            <DepartmentPill name="Engineering" count="276" />
            <DepartmentPill name="Business" count="198" />
            <DepartmentPill name="Law" count="143" />
            <DepartmentPill name="Design" count="96" />
            <DepartmentPill name="+ 12 more" count="→" />
          </div>
        </div>
      </div>
    </section>
  )
}
