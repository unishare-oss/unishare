import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  Bookmark,
  ClipboardCheck,
  GraduationCap,
  Heart,
  Layers,
  LayoutDashboard,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  BarChart3,
  Users,
  ExternalLink,
  FileText,
  Zap,
  Clock,
  Check,
  Play,
} from 'lucide-react'

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.73.083-.73 1.205.085 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.605-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.5 11.5 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.91 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  )
}
import { Button } from '@/components/ui/button'
import { LandingNav } from '@/components/landing/landing-nav'

export const metadata = {
  title: 'Unishare — Every note, past paper and study guide, shared',
  description:
    "Every lecture note, past paper, and study guide — shared by students who've been there. Organized by course, enriched by discussion.",
}

function BadgePill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border-2 border-border-strong bg-card px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest shadow-[2px_2px_0_0_var(--shadow-color)]">
      <span className="size-2 rounded-full bg-success animate-pulse" />
      {children}
    </span>
  )
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
  accent,
}: {
  icon: React.ElementType
  title: string
  desc: string
  accent: string
}) {
  return (
    <div className="card-pop card-pop-hover flex flex-col gap-4 rounded-2xl bg-card p-6">
      <div
        className="flex size-11 items-center justify-center rounded-xl border-2 border-border-strong text-card-foreground shadow-[2px_2px_0_0_var(--shadow-color)]"
        style={{ background: accent }}
      >
        <Icon className="size-5" />
      </div>
      <div>
        <h3 className="text-[15px] font-black tracking-tight">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{desc}</p>
      </div>
    </div>
  )
}

// Inline hero illustration — pure CSS, theme-aware
function HeroIllustration() {
  return (
    <div className="relative mx-auto aspect-[1.05] w-full max-w-[520px] lg:mx-0">
      {/* glow */}
      <div className="absolute inset-0 -z-10 rounded-[32px] bg-amber-subtle blur-2xl opacity-60" />

      {/* Back paper */}
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
        {/* washi tape */}
        <div className="desk-tape bg-amber/70" style={{ ['--tape-tilt' as string]: '3deg' }} />
      </div>

      {/* Middle paper */}
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
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-amber-subtle px-3 py-2">
            <div className="flex size-7 items-center justify-center rounded-full bg-amber text-white">
              <Sparkles className="size-3.5" />
            </div>
            <p className="text-xs font-bold leading-tight">
              24 solves • 4.8★ <span className="font-normal text-text-secondary">avg. helpful</span>
            </p>
          </div>
        </div>
      </div>

      {/* Front paper — note */}
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
          <span className="flex items-center gap-1 rounded-full border border-border bg-success/10 px-2 py-1 font-mono text-[10px] font-bold text-success">
            <span className="size-1.5 rounded-full bg-success" /> Verified
          </span>
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
          <div className="mt-3 rounded-xl border border-dashed border-border bg-muted/60 p-2.5">
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
        <div className="desk-tape bg-amber" style={{ ['--tape-tilt' as string]: '-2deg' }} />
      </div>

      {/* Floating badges */}
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

function DepartmentPill({
  name,
  count,
  active,
}: {
  name: string
  count: string
  active?: boolean
}) {
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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <LandingNav />

      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* subtle grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.035]"
          style={{
            backgroundImage:
              'linear-gradient(var(--border-strong) 1px, transparent 1px), linear-gradient(90deg, var(--border-strong) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        {/* soft amber blob */}
        <div className="pointer-events-none absolute -top-24 right-0 -z-10 h-[520px] w-[520px] rounded-full bg-amber-subtle blur-[90px] opacity-60" />

        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <div className="grid items-center gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6 lg:py-16">
            {/* left */}
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

            {/* right */}
            <div className="relative lg:pl-4">
              <HeroIllustration />
              {/* quick search mock below illustration on mobile */}
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

          {/* departments strip */}
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

      {/* FEATURE GRID — like Nest’s 6 cards */}
      <section id="features" className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-amber">
            Why UniShare
          </p>
          <h2 className="mt-2 text-balance text-3xl font-black tracking-tight sm:text-4xl">
            Built for how you study, not how files are stored
          </h2>
          <p className="mx-auto mt-3 max-w-[60ch] text-sm leading-relaxed text-text-secondary sm:text-base">
            Everything you need to share, find and actually learn from each other — in one calm,
            searchable place.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={Layers}
            title="Organized by course & year"
            desc="Every post is tied to a department, course and module. Filter to exactly your year — no more hunting in Drive folders."
            accent="var(--amber)"
          />
          <FeatureCard
            icon={UploadCloud}
            title="Fast uploads & previews"
            desc="Drop PDFs, slides or docs. Instant previews, view counts and course-aware suggestions while you type."
            accent="var(--info)"
          />
          <FeatureCard
            icon={LayoutDashboard}
            title="Collaborative boards"
            desc="Sketch, pin references and map topics together on an infinite canvas. E2E-encrypted, live cursors included."
            accent="var(--type-exam)"
          />
          <FeatureCard
            icon={MessageCircle}
            title="Cohort chat & threads"
            desc="Course-group chats and post comments keep discussion where the material lives — searchable later."
            accent="var(--type-exercise)"
          />
          <FeatureCard
            icon={ClipboardCheck}
            title="Quizzes & practice"
            desc="Turn any set of notes into practice quizzes. Spaced repetition friendly, results stay private."
            accent="var(--success)"
          />
          <FeatureCard
            icon={Bookmark}
            title="Saves, reactions & trending"
            desc="Bookmark for later, react to help others surface the best, and follow the weekly trending board."
            accent="var(--amber)"
          />
        </div>
      </section>

      {/* DEEP DIVES — 3 alternating sections like Nest's Observe / Devtools / Mau */}
      <section id="how-it-works" className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-text-muted">
              When there&apos;s no folder
            </p>
            <p className="mt-1 font-mono text-xs font-bold uppercase tracking-widest text-amber">
              — we built our own campus
            </p>
            <h2 className="mt-3 text-balance text-3xl font-black tracking-tight sm:text-4xl">
              Tools that make sharing feel natural
            </h2>
          </div>

          {/* 1 — Boards */}
          <div id="boards" className="mt-12 grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
            <div className="order-1">
              <p className="font-mono text-xs font-bold uppercase tracking-widest text-type-exam">
                Boards • Visual collaboration
              </p>
              <h3 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                Map ideas like you would on a whiteboard
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                Infinite canvas, sticky notes, freehand drawing and live presence. Perfect for exam
                mind-maps, project planning or just laying out a messy topic until it clicks.
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                {[
                  'E2E encrypted — your board stays yours',
                  'Export to PNG / PDF for submission',
                  'Templates for mind-maps & timelines',
                ].map((t) => (
                  <li key={t} className="flex gap-2">
                    <span className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-success text-white">
                      <Check className="size-3" />
                    </span>
                    <span className="font-medium">{t}</span>
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" className="mt-6 rounded-full bg-card font-bold">
                <Link href="/boards">
                  Try Boards <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
            <div className="order-2 rounded-[20px] border-2 border-border-strong bg-card p-3 shadow-[6px_6px_0_0_var(--shadow-color)] sm:p-4">
              <div className="rounded-xl border border-border bg-muted p-3">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-destructive" />
                  <span className="size-2 rounded-full bg-amber" />
                  <span className="size-2 rounded-full bg-success" />
                  <span className="ml-auto font-mono text-[10px] font-bold uppercase text-text-muted">
                    Bio 201 • Midterm map
                  </span>
                </div>
                <div className="relative mt-3 h-[220px] overflow-hidden rounded-xl border border-border bg-card p-3">
                  {/* sticky notes */}
                  <div className="absolute left-3 top-3 w-[42%] rounded-xl border-2 border-border-strong bg-amber-subtle p-3 shadow-[2px_2px_0_0_var(--shadow-color)]">
                    <p className="font-mono text-[10px] font-bold uppercase">Cell cycle</p>
                    <p className="mt-1 text-xs font-bold leading-tight">G1 → S → G2 → M</p>
                  </div>
                  <div className="absolute right-4 top-8 w-[45%] rotate-1 rounded-xl border-2 border-border-strong bg-card p-3 shadow-[2px_2px_0_0_var(--shadow-color)]">
                    <p className="font-mono text-[10px] font-bold uppercase text-type-exam">
                      Checkpoints
                    </p>
                    <p className="mt-1 text-xs leading-tight">p53, cyclins, CDKs...</p>
                  </div>
                  <div className="absolute bottom-4 left-6 w-[56%] -rotate-1 rounded-xl border-2 border-border-strong bg-success/15 p-3 shadow-[2px_2px_0_0_var(--shadow-color)]">
                    <p className="text-xs font-bold">“Exam Q 2022 — draw mitosis”</p>
                    <p className="font-mono text-[10px] text-text-muted">→ add diagram tomorrow</p>
                  </div>
                  {/* live cursors */}
                  <div className="absolute bottom-10 right-10 flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1 font-mono text-[10px] font-bold shadow-sm">
                    <span className="size-2 rounded-full bg-amber" /> Maya is drawing
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between font-mono text-[11px] text-text-muted">
                  <span>3 collaborators • autosaved</span>
                  <span className="flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-success" /> Live
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2 — Chat */}
          <div className="mt-16 grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
            <div className="order-2 lg:order-1 rounded-[20px] border-2 border-border-strong bg-card p-3 shadow-[6px_6px_0_0_var(--shadow-color)] sm:p-4">
              <div className="rounded-xl border border-border bg-muted p-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-full bg-primary font-mono text-xs font-bold text-primary-foreground">
                    CS
                  </div>
                  <div>
                    <p className="text-xs font-black leading-none">CS-204 • Chat</p>
                    <p className="font-mono text-[11px] text-text-muted">128 members • 4 online</p>
                  </div>
                  <span className="ml-auto rounded-full bg-success/15 px-2 py-1 font-mono text-[10px] font-bold text-success">
                    Active now
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex gap-2">
                    <div className="size-7 shrink-0 rounded-full bg-amber-subtle" />
                    <div className="rounded-2xl rounded-tl-sm border border-border bg-card px-3 py-2 shadow-sm">
                      <p className="text-xs font-bold">Anyone have L12 trees notes?</p>
                      <p className="font-mono text-[10px] text-text-muted">Aisha • 10:42</p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <div className="rounded-2xl rounded-tr-sm bg-primary px-3 py-2 text-primary-foreground">
                      <p className="text-xs font-medium">Yep — shared “Trees & Traversals” ✅</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="size-7 shrink-0 rounded-full bg-info/20" />
                    <div className="rounded-2xl rounded-tl-sm border border-border bg-card px-3 py-2 shadow-sm">
                      <p className="text-xs">That saved me, thank you!</p>
                      <p className="font-mono text-[10px] text-text-muted">Jonas • 10:43</p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2">
                  <span className="font-mono text-xs text-text-muted">Message #cs-204 …</span>
                  <span className="ml-auto flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <ArrowRight className="size-3.5" />
                  </span>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <p className="font-mono text-xs font-bold uppercase tracking-widest text-info">
                Chat • Stay in the loop
              </p>
              <h3 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                Discussion that stays with the material
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                Course-group chats and threaded comments live alongside the files. Ask a question on
                a note, get an answer that future students can find too.
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                {[
                  'Realtime with Socket.IO, read receipts & typing',
                  'Threads on any post — not lost in chat',
                  'Searchable history per course',
                ].map((t) => (
                  <li key={t} className="flex gap-2">
                    <span className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-info text-white">
                      <Check className="size-3" />
                    </span>
                    <span className="font-medium">{t}</span>
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" className="mt-6 rounded-full bg-card font-bold">
                <Link href="/chat">
                  Open chat <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* 3 — Quizzes */}
          <div className="mt-16 grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-widest text-success">
                Quizzes • Practice
              </p>
              <h3 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                Turn notes into confidence
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                Generate practice quizzes from any reading list or set of notes. Attempts stay
                private — perfect for that last-night self-test before the exam.
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                {[
                  'MCQ & short answer, auto-graded',
                  'Reading-list aware — quizzes follow your list',
                  'Retake & track improvement',
                ].map((t) => (
                  <li key={t} className="flex gap-2">
                    <span className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-success text-white">
                      <Check className="size-3" />
                    </span>
                    <span className="font-medium">{t}</span>
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" className="mt-6 rounded-full bg-card font-bold">
                <Link href="/quizzes">
                  Explore quizzes <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
            <div className="rounded-[20px] border-2 border-border-strong bg-card p-3 shadow-[6px_6px_0_0_var(--shadow-color)] sm:p-4">
              <div className="rounded-xl border border-border bg-muted p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black">Data Structures — Quiz 2</p>
                  <span className="rounded-full bg-amber px-2 py-1 font-mono text-[10px] font-bold text-white">
                    12 Qs • 15 min
                  </span>
                </div>
                <div className="mt-3 rounded-xl border-2 border-border-strong bg-card p-3 shadow-[2px_2px_0_0_var(--shadow-color)]">
                  <p className="text-sm font-bold">Which traversal visits root first?</p>
                  <div className="mt-2 space-y-1.5">
                    {[
                      { label: 'In-order', active: false },
                      { label: 'Pre-order', active: true },
                      { label: 'Post-order', active: false },
                      { label: 'Level-order', active: false },
                    ].map((o) => (
                      <div
                        key={o.label}
                        className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-medium ${
                          o.active ? 'border-amber bg-amber-subtle' : 'border-border bg-card'
                        }`}
                      >
                        <span
                          className={`flex size-5 items-center justify-center rounded-full border-2 text-[10px] font-bold ${
                            o.active ? 'border-amber bg-amber text-white' : 'border-border bg-muted'
                          }`}
                        >
                          {o.active ? <Check className="size-3" /> : ''}
                        </span>
                        {o.label}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-mono text-xs text-text-muted">Q 3 of 12</span>
                  <span className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
                    Next →
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CODE / SELF-HOST — like Nest’s “Build your app with elegant syntax” */}
      <section id="self-host" className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6 sm:py-16">
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-amber">
              Self-host • Open source
            </p>
            <h2 className="mt-2 text-balance text-3xl font-black tracking-tight sm:text-4xl">
              Your university. Your data. Your deploy.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              One Docker Compose file. Bring your Postgres, your S3 and your IdP. No lock-in, no
              data mining — just a well-lit place for students to learn together.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-full border border-border bg-card px-3 py-1.5 font-mono text-xs font-bold">
                MIT License
              </span>
              <span className="rounded-full border border-border bg-card px-3 py-1.5 font-mono text-xs font-bold">
                Docker ready
              </span>
              <span className="rounded-full border border-border bg-card px-3 py-1.5 font-mono text-xs font-bold">
                S3 / R2 storage
              </span>
              <span className="rounded-full border border-border bg-card px-3 py-1.5 font-mono text-xs font-bold">
                Postgres + Redis
              </span>
            </div>
            <div className="mt-6 flex gap-3">
              <Button asChild className="rounded-full">
                <a
                  href="https://github.com/unishare-oss/unishare"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <GithubIcon className="size-4" /> View on GitHub
                </a>
              </Button>
              <Button asChild variant="outline" className="rounded-full bg-card">
                <Link href="/changelog">Release notes</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-[20px] border-2 border-border-strong bg-card p-3 shadow-[6px_6px_0_0_var(--shadow-color)] sm:p-4">
            {/* window chrome */}
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <span className="size-3 rounded-full bg-destructive" />
              <span className="size-3 rounded-full bg-amber" />
              <span className="size-3 rounded-full bg-success" />
              <span className="ml-auto rounded bg-muted px-2 py-1 font-mono text-[11px] font-bold text-text-muted">
                bash — unishare
              </span>
            </div>
            <div className="rounded-xl bg-surface-dark p-4 font-mono text-[13px] leading-relaxed text-[#F7F3EE] sm:p-5">
              <div className="space-y-3">
                <div>
                  <p className="text-white/40"># 1. Clone & configure</p>
                  <p>
                    <span className="text-success">$</span> git clone
                    https://github.com/unishare-oss/unishare
                  </p>
                  <p>
                    <span className="text-success">$</span> cp apps/api/.env.example apps/api/.env
                  </p>
                  <p>
                    <span className="text-success">$</span> cp apps/web/.env.example apps/web/.env
                  </p>
                </div>
                <div>
                  <p className="text-white/40"># 2. Start everything</p>
                  <p>
                    <span className="text-success">$</span> pnpm install
                  </p>
                  <p>
                    <span className="text-success">$</span> docker compose up -d
                  </p>
                  <p>
                    <span className="text-success">$</span> pnpm --filter api prisma migrate dev
                  </p>
                </div>
                <div>
                  <p className="text-white/40"># 3. Go</p>
                  <p>
                    <span className="text-amber">→</span> web: http://localhost:3000
                  </p>
                  <p>
                    <span className="text-amber">→</span> api: http://localhost:3001/docs
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs">
                <span className="size-2 rounded-full bg-success animate-pulse" /> Self-host docs at{' '}
                <a
                  href="https://github.com/unishare-oss/unishare#self-hosting"
                  className="underline decoration-amber underline-offset-4"
                >
                  /docs/self-host
                </a>
              </div>
            </div>
            <p className="px-2 pt-3 text-center font-mono text-xs text-text-muted">
              Deploy to Fly, Railway, Render or your own VPS — same compose file.
            </p>
          </div>
        </div>
      </section>

      {/* STATS — like Nest's monthly downloads */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { k: 'Course-aware', v: 'Search & filters', sub: 'Dept → Course → Module' },
              { k: 'Real-time', v: 'Chat & boards', sub: 'Socket.IO live cursors' },
              {
                k: 'Private by default',
                v: 'Your cohort only',
                sub: 'University allow-list & SSO',
              },
            ].map((s) => (
              <div key={s.v} className="text-center">
                <p className="font-mono text-xs font-bold uppercase tracking-widest text-amber">
                  {s.k}
                </p>
                <p className="mt-1 text-xl font-black tracking-tight">{s.v}</p>
                <p className="font-mono text-xs text-text-muted">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA — like Nest's "Let's build together" */}
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
                Join Unishare, find your department, and pick up where someone just like you left
                off — or leave the notes you wish you’d had.
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

      {/* FOOTER — mirrored from Nest but in UniShare skin */}
      <footer className="border-t-2 border-border-strong bg-card">
        <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
            <div>
              <Link href="/" className="flex items-center gap-2.5">
                <Image
                  src="/icon.svg"
                  alt=""
                  width={28}
                  height={28}
                  className="rounded-[7px] border border-border-strong/10"
                />
                <span className="font-mono text-base font-black tracking-tight">Unishare</span>
              </Link>
              <p className="mt-3 max-w-[32ch] text-sm leading-relaxed text-text-secondary">
                An open-source academic content sharing platform for university students — share
                notes, past papers and resources with your department.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <a
                  href="https://github.com/unishare-oss/unishare"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex size-9 items-center justify-center rounded-xl border-2 border-border-strong bg-card shadow-[2px_2px_0_0_var(--shadow-color)] hover:translate-y-px hover:shadow-[1px_1px_0_0_var(--shadow-color)]"
                  aria-label="GitHub"
                >
                  <GithubIcon className="size-4" />
                </a>
                <Link
                  href="/changelog"
                  className="inline-flex items-center gap-1.5 rounded-xl border-2 border-border-strong bg-card px-3 py-2 font-mono text-xs font-bold shadow-[2px_2px_0_0_var(--shadow-color)]"
                >
                  Changelog
                </Link>
                <span className="rounded-full bg-success/15 px-2.5 py-1 font-mono text-xs font-bold text-success">
                  MIT
                </span>
              </div>
            </div>

            <div>
              <h3 className="font-mono text-xs font-bold uppercase tracking-widest">Platform</h3>
              <ul className="mt-3 space-y-2 text-sm font-medium text-text-secondary">
                <li>
                  <Link
                    href="/feed"
                    className="hover:text-foreground hover:underline underline-offset-4"
                  >
                    Feed
                  </Link>
                </li>
                <li>
                  <Link
                    href="/boards"
                    className="hover:text-foreground hover:underline underline-offset-4"
                  >
                    Boards
                  </Link>
                </li>
                <li>
                  <Link
                    href="/chat"
                    className="hover:text-foreground hover:underline underline-offset-4"
                  >
                    Chat
                  </Link>
                </li>
                <li>
                  <Link
                    href="/quizzes"
                    className="hover:text-foreground hover:underline underline-offset-4"
                  >
                    Quizzes
                  </Link>
                </li>
                <li>
                  <Link
                    href="/departments"
                    className="hover:text-foreground hover:underline underline-offset-4"
                  >
                    Departments
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-mono text-xs font-bold uppercase tracking-widest">Resources</h3>
              <ul className="mt-3 space-y-2 text-sm font-medium text-text-secondary">
                <li>
                  <a
                    href="https://github.com/unishare-oss/unishare#readme"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground hover:underline underline-offset-4"
                  >
                    Documentation
                  </a>
                </li>
                <li>
                  <Link
                    href="/changelog"
                    className="hover:text-foreground hover:underline underline-offset-4"
                  >
                    Changelog
                  </Link>
                </li>
                <li>
                  <a
                    href="https://github.com/unishare-oss/unishare/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground hover:underline underline-offset-4"
                  >
                    Report an issue
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/unishare-oss/unishare"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground hover:underline underline-offset-4"
                  >
                    GitHub
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-mono text-xs font-bold uppercase tracking-widest">Legal</h3>
              <ul className="mt-3 space-y-2 text-sm font-medium text-text-secondary">
                <li>
                  <Link
                    href="/terms"
                    className="hover:text-foreground hover:underline underline-offset-4"
                  >
                    Terms
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="hover:text-foreground hover:underline underline-offset-4"
                  >
                    Privacy
                  </Link>
                </li>
                <li>
                  <span className="font-mono text-xs text-text-muted">
                    © {new Date().getFullYear()} Unishare
                  </span>
                </li>
              </ul>
              <div className="mt-4 rounded-xl border-2 border-border-strong bg-amber-subtle p-3">
                <p className="font-mono text-xs font-bold uppercase tracking-widest text-amber">
                  Stay in the loop
                </p>
                <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                  Star us on GitHub — releases every week.
                </p>
                <Button asChild size="sm" className="mt-2 w-full rounded-full font-bold">
                  <a
                    href="https://github.com/unishare-oss/unishare"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <GithubIcon className="size-4" /> Star on GitHub
                  </a>
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 sm:flex-row">
            <p className="font-mono text-xs text-text-muted">
              Built by students, for students. Self-hostable. Open source. Not affiliated with any
              university.
            </p>
          </div>
        </div>
      </footer>

      {/* tiny helper: smooth scroll */}
      <style>{`html{scroll-behavior:smooth}`}</style>
    </div>
  )
}
