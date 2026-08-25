import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function LandingHowItWorks() {
  return (
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
          <div className="order-2 overflow-hidden rounded-[20px] border-2 border-border-strong bg-card p-3 shadow-[6px_6px_0_0_var(--shadow-color)] sm:p-4">
            <div className="overflow-hidden rounded-xl border border-border bg-white">
              <Image
                src="/board.png"
                alt="Unishare board - collaborative canvas"
                width={1200}
                height={750}
                className="h-auto w-full object-contain"
                priority
              />
            </div>
            <div className="mt-3 flex items-center justify-between px-1 font-mono text-[11px] text-text-muted">
              <span>Feed System • Fan-out Architecture</span>
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-success" /> Live
              </span>
            </div>
          </div>
        </div>

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
              Course-group chats and threaded comments live alongside the files. Ask a question on a
              note, get an answer that future students can find too.
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

        <div className="mt-16 grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-success">
              Quizzes • Practice
            </p>
            <h3 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              Turn notes into confidence
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              Generate practice quizzes from any reading list or set of notes. Attempts stay private
              — perfect for that last-night self-test before the exam.
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
  )
}
