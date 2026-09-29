'use client'

import { useRef, useState, type ReactNode } from 'react'
import { Check, FileText, Heart, MessageCircle, Search, Sparkles, Users } from 'lucide-react'

/** Front to back. Offsets are percentages of the card, so the stack scales with the hero. */
const SLOTS = [
  'translate(41%, 5%) rotate(-1.5deg)',
  'translate(26%, 24%) rotate(4deg)',
  'translate(12%, 8%) rotate(-8deg)',
]
/** Matches the .hero-card transition; hovers during a move are ignored so cards don't ping-pong. */
const MOVE_MS = 450

type CardId = 'note' | 'paper' | 'exercise'

const CARDS: Record<CardId, { tape: string; tilt: string; body: ReactNode }> = {
  note: { tape: 'bg-amber', tilt: '-2deg', body: <NoteCard /> },
  paper: { tape: 'bg-type-exam/70', tilt: '2deg', body: <PaperCard /> },
  exercise: { tape: 'bg-amber/70', tilt: '3deg', body: <ExerciseCard /> },
}

/**
 * The hero's stack of shared files. Cards deal in on load; hovering (or tapping) a card
 * behind brings it to the front.
 */
export function HeroIllustration() {
  const [order, setOrder] = useState<CardId[]>(['note', 'paper', 'exercise'])
  const moving = useRef(false)

  const bringForward = (id: CardId) => {
    if (order[0] === id || moving.current) return
    moving.current = true
    setTimeout(() => (moving.current = false), MOVE_MS)
    setOrder([id, ...order.filter((c) => c !== id)])
  }

  return (
    <div aria-hidden className="relative mx-auto aspect-[1.05] w-full max-w-[520px] lg:mx-0">
      <div className="absolute inset-0 -z-10 rounded-[32px] bg-amber-subtle blur-2xl opacity-60" />

      {(Object.keys(CARDS) as CardId[]).map((id, dealIndex) => {
        const slot = order.indexOf(id)
        const card = CARDS[id]
        return (
          <div
            key={id}
            data-front={slot === 0 || undefined}
            onPointerEnter={(e) => e.pointerType === 'mouse' && bringForward(id)}
            onClick={() => bringForward(id)}
            className="hero-card absolute left-0 top-0 h-[74%] w-[68%] rounded-2xl border-2 border-border-strong bg-card p-4 sm:p-5"
            style={
              {
                transform: SLOTS[slot],
                zIndex: 3 - slot,
                '--deal-delay': `${(2 - dealIndex) * 90}ms`,
              } as React.CSSProperties
            }
          >
            {card.body}
            <div
              className={`desk-tape ${card.tape}`}
              style={{ ['--tape-tilt' as string]: card.tilt }}
            />
          </div>
        )
      })}

      <div
        className="hero-chip absolute -left-2 bottom-[14%] z-10 hidden items-center gap-2 rounded-2xl border-2 border-border-strong bg-card px-3 py-2 shadow-[4px_4px_0_0_var(--shadow-color)] sm:flex"
        style={{ ['--chip-delay' as string]: '420ms' }}
      >
        <div className="flex size-8 items-center justify-center rounded-xl bg-success text-white">
          <Search className="size-4" />
        </div>
        <div>
          <p className="text-xs font-black leading-none">Find in seconds</p>
          <p className="font-mono text-[10px] text-text-muted">by course, tag, year</p>
        </div>
      </div>
      <div
        className="hero-chip absolute -right-2 top-[52%] z-10 hidden items-center gap-2 rounded-2xl border-2 border-border-strong bg-card px-3 py-2 shadow-[4px_4px_0_0_var(--shadow-color)] sm:flex"
        style={{ ['--chip-delay' as string]: '540ms' }}
      >
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

function TypeTag({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase text-white ${className}`}
    >
      {children}
    </span>
  )
}

function NoteCard() {
  return (
    <>
      <div className="flex items-center gap-2">
        <TypeTag className="bg-type-note">Note</TypeTag>
        <span className="hidden font-mono text-[11px] font-medium text-text-muted sm:inline">
          CS-101 • L12
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
        <div className="mt-3 hidden rounded-xl border border-dashed border-border bg-muted/60 p-2.5 md:block">
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
        <div className="hidden items-center gap-1.5 md:flex">
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
    </>
  )
}

function PaperCard() {
  return (
    <>
      <div className="flex items-center gap-2">
        <TypeTag className="bg-type-exam">Past paper</TypeTag>
        <span className="font-mono text-[10px] text-text-muted">MED-301 • 2023</span>
      </div>
      <h4 className="mt-3 text-sm font-black leading-tight">Midterm — Pathology</h4>
      <p className="mt-1 font-mono text-[11px] text-text-muted">
        3 hrs • 40 marks • with solutions
      </p>
      <div className="mt-3 space-y-1.5">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex gap-2">
            <span
              className={`flex size-5 items-center justify-center rounded-full border font-mono text-[10px] font-bold ${
                n === 3 ? 'border-amber bg-amber text-white' : 'border-border bg-accent'
              }`}
            >
              {n}
            </span>
            <div className="h-1.5 flex-1 self-center rounded bg-foreground/10" />
          </div>
        ))}
      </div>
      <div className="mt-4 hidden items-center gap-2 rounded-xl border border-border bg-amber-subtle px-3 py-2 md:flex">
        <div className="flex size-7 items-center justify-center rounded-full bg-amber text-white">
          <Sparkles className="size-3.5" />
        </div>
        <p className="text-xs font-bold leading-tight">
          24 solves • 4.8★ <span className="font-normal text-text-secondary">avg. helpful</span>
        </p>
      </div>
    </>
  )
}

function ExerciseCard() {
  return (
    <>
      <div className="flex items-center gap-2">
        <TypeTag className="bg-type-exercise">Exercise</TypeTag>
        <span className="font-mono text-[10px] text-text-muted">CS-204 • Year 2</span>
      </div>
      <h4 className="mt-3 text-sm font-black leading-tight">Traversal drills — Week 6</h4>
      <p className="mt-1 font-mono text-[11px] text-text-muted">12 problems • answers inside</p>
      <div className="mt-3 space-y-1.5">
        {['Pre-order of a BST', 'Rebuild from in + post', 'Level-order with a queue'].map(
          (t, i) => (
            <div
              key={t}
              className="flex items-center gap-2 rounded-lg border border-border bg-muted/60 px-2 py-1.5"
            >
              <span
                className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                  i < 2 ? 'border-success bg-success text-white' : 'border-border bg-card'
                }`}
              >
                {i < 2 && <Check className="size-2.5" />}
              </span>
              <span className="truncate text-[11px] font-medium">{t}</span>
            </div>
          ),
        )}
      </div>
      <div className="mt-3 hidden items-center gap-2 md:flex">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10">
          <div className="h-full w-[58%] rounded-full bg-type-exercise" />
        </div>
        <span className="font-mono text-[10px] font-bold text-text-muted">7/12</span>
      </div>
    </>
  )
}
