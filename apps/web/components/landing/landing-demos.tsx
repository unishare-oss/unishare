'use client'

import { useEffect, useRef, useState, type FormEvent, type PointerEvent } from 'react'
import {
  ArrowRight,
  Check,
  Eraser,
  FileText,
  Lock,
  MessageCircle,
  Pencil,
  Search,
  Sparkles,
  StickyNote,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/*
 * Small, self-contained versions of the real features for the landing page. Nothing here
 * talks to the API: every demo is local state, so visitors can poke at it before signing up.
 */

const press = 'transition-transform duration-150 ease-out active:scale-[0.97]'
const chip =
  'rounded-full border-2 px-3 py-1 text-xs font-bold transition-colors duration-150 ' + press

function Chip({
  active,
  onClick,
  demo,
  children,
}: {
  active: boolean
  onClick: () => void
  /** Target name for the scripted walk-through. */
  demo?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      data-demo={demo}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        chip,
        active
          ? 'border-amber bg-amber-subtle text-foreground'
          : 'border-border bg-card text-text-secondary hover:border-border-strong',
      )}
    >
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ Share */

const POST_TYPES = ['Lecture Note', 'Past paper', 'Exercise'] as const

export function ShareDemo() {
  const [type, setType] = useState<(typeof POST_TYPES)[number]>('Lecture Note')
  const [stage, setStage] = useState<'idle' | 'uploading' | 'posted'>('idle')

  useEffect(() => {
    if (stage !== 'uploading') return
    const t = setTimeout(() => setStage('posted'), 1400)
    return () => clearTimeout(t)
  }, [stage])

  return (
    <div className="flex min-h-[260px] flex-col p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border-2 border-border-strong bg-muted">
          <FileText className="size-5 text-type-exam" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-black">Trees &amp; Traversals.pdf</p>
          <p className="font-mono text-[11px] text-text-muted">2.4 MB • Lecture 12</p>
        </div>
      </div>

      <p className="mt-4 font-mono text-[10px] font-bold uppercase tracking-widest text-text-muted">
        What is it?
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {POST_TYPES.map((t) => (
          <Chip
            key={t}
            demo={`type-${t}`}
            active={type === t}
            onClick={() => stage === 'idle' && setType(t)}
          >
            {t}
          </Chip>
        ))}
        <span className="rounded-full border-2 border-dashed border-border px-3 py-1 text-xs font-bold text-text-muted">
          CS-204 • Year 2
        </span>
      </div>

      <div className="mt-auto pt-5">
        {stage === 'posted' ? (
          <div className="demo-pop flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-text-secondary">
              Filed under <span className="font-bold text-foreground">CS-204 → {type}</span>
            </p>
            <button
              type="button"
              onClick={() => setStage('idle')}
              className={cn('shrink-0 text-xs font-bold text-text-muted underline', press)}
            >
              Share another
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full border border-border bg-muted">
              <div
                className={cn(
                  'h-full rounded-full bg-amber',
                  stage === 'uploading'
                    ? 'w-full transition-[width] duration-[1400ms] ease-out'
                    : 'w-0',
                )}
              />
            </div>
            <button
              type="button"
              data-demo="upload"
              disabled={stage === 'uploading'}
              onClick={() => setStage('uploading')}
              className={cn(
                'shrink-0 rounded-full bg-primary px-4 py-2 text-xs font-black text-primary-foreground disabled:opacity-70',
                press,
              )}
            >
              {stage === 'uploading' ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        )}
        {stage === 'posted' && (
          <span className="demo-pop mt-3 inline-flex items-center gap-1.5 rounded-full bg-success px-3 py-1.5 text-xs font-black text-white shadow-[2px_2px_0_0_var(--shadow-color)]">
            Posted <Check className="size-3.5" />
          </span>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------- Find */

type FindPost = {
  title: string
  meta: string
  type: 'Note' | 'Past paper' | 'Exercise'
  year: 1 | 2
}

const FIND_POSTS: FindPost[] = [
  { title: 'Trees & Traversals', meta: 'Lecture 12 • 2.4 MB', type: 'Note', year: 2 },
  { title: 'CS-204 Final • 2025', meta: '3 hrs • with solutions', type: 'Past paper', year: 2 },
  { title: 'Traversal drills', meta: '12 problems • Week 6', type: 'Exercise', year: 2 },
  { title: 'Big-O cheat sheet', meta: 'One page • 1.1k saves', type: 'Note', year: 1 },
  { title: 'CS-101 Midterm • 2024', meta: '90 min • marked', type: 'Past paper', year: 1 },
  { title: 'Recursion warm-ups', meta: '8 problems • Week 3', type: 'Exercise', year: 1 },
]

const TYPE_STYLE: Record<FindPost['type'], string> = {
  Note: 'border-l-type-note',
  'Past paper': 'border-l-type-exam',
  Exercise: 'border-l-type-exercise',
}

export function FindDemo() {
  const [query, setQuery] = useState('')
  const [year, setYear] = useState<1 | 2 | null>(2)
  const [type, setType] = useState<FindPost['type'] | null>(null)

  const q = query.trim().toLowerCase()
  const results = FIND_POSTS.filter(
    (p) =>
      (!year || p.year === year) &&
      (!type || p.type === type) &&
      (!q || `${p.title} ${p.meta} ${p.type}`.toLowerCase().includes(q)),
  )

  return (
    <div className="flex min-h-[260px] flex-col p-4 sm:p-5">
      <label className="flex items-center gap-2 rounded-xl border-2 border-border-strong bg-card px-3 py-2 focus-within:border-amber">
        <Search className="size-4 shrink-0 text-text-muted" />
        <input
          data-demo="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Try “final” or “trees”"
          aria-label="Search the demo feed"
          className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-text-muted"
        />
        {query && (
          <button
            type="button"
            data-demo="clear"
            aria-label="Clear search"
            onClick={() => setQuery('')}
          >
            <X className="size-4 text-text-muted" />
          </button>
        )}
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        {([1, 2] as const).map((y) => (
          <Chip
            key={y}
            demo={`year-${y}`}
            active={year === y}
            onClick={() => setYear(year === y ? null : y)}
          >
            Year {y}
          </Chip>
        ))}
        {(['Note', 'Past paper', 'Exercise'] as const).map((t) => (
          <Chip
            key={t}
            demo={`type-${t}`}
            active={type === t}
            onClick={() => setType(type === t ? null : t)}
          >
            {t}
          </Chip>
        ))}
      </div>
      <ul className="mt-3 space-y-2" aria-live="polite">
        {results.slice(0, 3).map((p) => (
          <li
            key={p.title}
            className={cn(
              'demo-pop flex items-center justify-between gap-3 rounded-xl border-2 border-l-[5px] border-border bg-card px-3 py-2',
              TYPE_STYLE[p.type],
            )}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-black">{p.title}</p>
              <p className="truncate font-mono text-[10px] text-text-muted">{p.meta}</p>
            </div>
            <span className="shrink-0 font-mono text-[10px] font-bold uppercase text-text-muted">
              Y{p.year}
            </span>
          </li>
        ))}
        {results.length === 0 && (
          <li className="rounded-xl border-2 border-dashed border-border px-3 py-4 text-center text-xs text-text-muted">
            Nothing yet — in the real app, someone&apos;s request would show up here.
          </li>
        )}
      </ul>
      <p className="mt-auto pt-3 font-mono text-[10px] text-text-muted">
        {results.length} of {FIND_POSTS.length} in CS-204
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------- Chat */

type Message = { id: number; from: 'Aisha' | 'Jonas' | 'You'; text: string; file?: string }

const REPLIES = [
  'Same question here 😅 pinning this.',
  'Check the Week 6 drills — question 4 is on every past paper.',
  'Board session at 7? I’ll bring the tree diagrams.',
]

export function ChatDemo() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, from: 'Aisha', text: 'Anyone have L12 trees notes?' },
    { id: 2, from: 'You', text: 'Yep — shared it ✅', file: 'Trees & Traversals.pdf' },
    { id: 3, from: 'Aisha', text: 'That saved me, thank you!' },
  ])
  const [draft, setDraft] = useState('')
  const [typing, setTyping] = useState(false)
  const replyIndex = useRef(0)
  const listRef = useRef<HTMLDivElement>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])

  const send = (e: FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    setDraft('')
    setMessages((m) => [...m, { id: Date.now(), from: 'You' as const, text }].slice(-8))
    timers.current.push(
      setTimeout(() => setTyping(true), 500),
      setTimeout(() => {
        setTyping(false)
        const reply = REPLIES[replyIndex.current++ % REPLIES.length]
        setMessages((m) =>
          [...m, { id: Date.now(), from: 'Jonas' as const, text: reply }].slice(-8),
        )
      }, 1700),
    )
  }

  return (
    <div className="flex h-[300px] flex-col p-3 sm:p-4">
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg border-2 border-border-strong bg-amber-subtle">
          <MessageCircle className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-black leading-none">CS-204 • Chat</p>
          <p className="font-mono text-[10px] text-text-muted">128 members • 4 online</p>
        </div>
        <span className="ml-auto flex items-center gap-1 rounded-full bg-success/15 px-2 py-1 font-mono text-[10px] font-bold text-success">
          <Lock className="size-2.5" /> E2E
        </span>
      </div>

      <div ref={listRef} className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1" aria-live="polite">
        {messages.map((m) =>
          m.from === 'You' ? (
            <div key={m.id} className="demo-pop flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-3 py-2 text-primary-foreground">
                <p className="text-xs font-medium">{m.text}</p>
                {m.file && (
                  <p className="mt-1.5 flex items-center gap-1 rounded-md bg-primary-foreground/15 px-2 py-1 font-mono text-[10px]">
                    <FileText className="size-3" /> {m.file}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div key={m.id} className="demo-pop flex gap-2">
              <div
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold',
                  m.from === 'Aisha' ? 'bg-amber-subtle' : 'bg-info/20',
                )}
              >
                {m.from[0]}
              </div>
              <div className="max-w-[80%] rounded-2xl rounded-tl-sm border border-border bg-card px-3 py-2 shadow-sm">
                <p className="text-xs">{m.text}</p>
                <p className="font-mono text-[10px] text-text-muted">{m.from}</p>
              </div>
            </div>
          ),
        )}
        {typing && (
          <p className="demo-pop pl-8 font-mono text-[10px] text-text-muted">Jonas is typing…</p>
        )}
      </div>

      <form
        onSubmit={send}
        className="mt-3 flex items-center gap-2 rounded-full border-2 border-border bg-card py-1 pl-3 pr-1 focus-within:border-amber"
      >
        <input
          data-demo="message"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message #cs-204 …"
          aria-label="Message the demo chat"
          maxLength={120}
          className="w-full min-w-0 bg-transparent text-xs outline-none placeholder:text-text-muted"
        />
        <button
          type="submit"
          data-demo="send"
          aria-label="Send"
          className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground',
            press,
          )}
        >
          <ArrowRight className="size-3.5" />
        </button>
      </form>
    </div>
  )
}

/* ----------------------------------------------------------------- Boards */

type Sticky = { id: number; x: number; y: number; text: string; tone: string }

const TONES = ['bg-amber-subtle', 'bg-info/20', 'bg-success/20', 'bg-type-exam/15']
const STARTER: Sticky[] = [
  { id: 1, x: 8, y: 14, text: 'Pre-order: root, L, R', tone: TONES[0] },
  { id: 2, x: 56, y: 10, text: 'In-order → sorted BST', tone: TONES[1] },
  { id: 3, x: 34, y: 58, text: 'Level-order = queue', tone: TONES[2] },
]
const NEW_NOTES = ['Post-order: L, R, root', 'Ask about Q4 in lab', 'Height = longest path']

/** Scripted drags use a made-up pointer id, which the browser refuses to capture. */
function capture(e: PointerEvent) {
  try {
    e.currentTarget.setPointerCapture(e.pointerId)
  } catch {}
}

export function BoardsDemo() {
  const boardRef = useRef<HTMLDivElement>(null)
  const [stickies, setStickies] = useState(STARTER)
  const [paths, setPaths] = useState<string[]>([])
  const [pen, setPen] = useState(false)
  const drag = useRef<{ id: number; dx: number; dy: number } | null>(null)
  const drawing = useRef<string | null>(null)
  const added = useRef(0)

  const toPercent = (e: PointerEvent) => {
    const r = boardRef.current!.getBoundingClientRect()
    return {
      x: ((e.clientX - r.left) / r.width) * 100,
      y: ((e.clientY - r.top) / r.height) * 100,
    }
  }

  const startDrag = (e: PointerEvent, s: Sticky) => {
    if (pen) return
    e.stopPropagation()
    capture(e)
    const p = toPercent(e)
    drag.current = { id: s.id, dx: p.x - s.x, dy: p.y - s.y }
    setStickies((all) => [...all.filter((n) => n.id !== s.id), s])
  }
  const moveDrag = (e: PointerEvent) => {
    const d = drag.current
    if (!d) return
    const p = toPercent(e)
    const x = Math.min(Math.max(p.x - d.dx, 0), 66)
    const y = Math.min(Math.max(p.y - d.dy, 0), 74)
    setStickies((all) => all.map((n) => (n.id === d.id ? { ...n, x, y } : n)))
  }

  const startDraw = (e: PointerEvent) => {
    if (!pen) return
    capture(e)
    const p = toPercent(e)
    drawing.current = `M${p.x.toFixed(1)} ${p.y.toFixed(1)}`
    setPaths((all) => [...all, drawing.current!])
  }
  const moveDraw = (e: PointerEvent) => {
    if (!drawing.current) return
    const p = toPercent(e)
    drawing.current += ` L${p.x.toFixed(1)} ${p.y.toFixed(1)}`
    const d = drawing.current
    setPaths((all) => [...all.slice(0, -1), d])
  }

  const addSticky = () => {
    const i = added.current++
    setStickies((all) => [
      ...all,
      {
        id: Date.now(),
        x: 20 + ((i * 17) % 40),
        y: 30 + ((i * 11) % 30),
        text: NEW_NOTES[i % NEW_NOTES.length],
        tone: TONES[(i + 3) % TONES.length],
      },
    ])
  }

  return (
    <div className="p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          data-demo="sticky"
          onClick={addSticky}
          className={cn(chip, 'inline-flex items-center gap-1.5 border-border bg-card')}
        >
          <StickyNote className="size-3.5" /> Sticky
        </button>
        <button
          type="button"
          data-demo="pen"
          aria-pressed={pen}
          onClick={() => setPen(!pen)}
          className={cn(
            chip,
            'inline-flex items-center gap-1.5',
            pen ? 'border-amber bg-amber-subtle' : 'border-border bg-card',
          )}
        >
          <Pencil className="size-3.5" /> Pen
        </button>
        <button
          type="button"
          onClick={() => {
            setPaths([])
            setStickies(STARTER)
          }}
          className={cn(chip, 'inline-flex items-center gap-1.5 border-border bg-card')}
        >
          <Eraser className="size-3.5" /> Reset
        </button>
        <span className="ml-auto flex items-center gap-1 rounded-full bg-success px-2 py-1 font-mono text-[10px] font-bold text-white">
          <Lock className="size-2.5" /> E2E
        </span>
      </div>

      <div
        ref={boardRef}
        data-demo="board"
        onPointerDown={startDraw}
        onPointerMove={(e) => (drag.current ? moveDrag(e) : moveDraw(e))}
        onPointerUp={() => {
          drag.current = null
          drawing.current = null
        }}
        className={cn(
          'relative mt-3 h-[240px] overflow-hidden rounded-xl border-2 border-border bg-muted/40 sm:h-[260px]',
          pen && 'cursor-crosshair touch-none',
        )}
        style={{
          backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        }}
      >
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 size-full"
        >
          {paths.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              stroke="var(--amber)"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        {stickies.map((s) => (
          <div
            key={s.id}
            data-demo={`note-${s.id}`}
            data-demo-grab
            onPointerDown={(e) => startDrag(e, s)}
            className={cn(
              'demo-pop absolute w-[34%] touch-none select-none rounded-lg border-2 border-border-strong p-2 text-[11px] font-bold leading-snug shadow-[3px_3px_0_0_var(--shadow-color)]',
              s.tone,
              pen ? 'pointer-events-none' : 'cursor-grab active:cursor-grabbing',
            )}
            style={{ left: `${s.x}%`, top: `${s.y}%` }}
          >
            {s.text}
          </div>
        ))}
        {paths.length === 0 && !pen && (
          <p className="pointer-events-none absolute bottom-2 right-3 font-mono text-[10px] text-text-muted">
            drag a note • or pick the pen
          </p>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------- Quiz */

const QUESTIONS = [
  {
    q: 'Which traversal visits the root first?',
    options: ['In-order', 'Pre-order', 'Post-order', 'Level-order'],
    answer: 1,
  },
  {
    q: 'In-order traversal of a BST gives…',
    options: ['Random order', 'Reverse order', 'Sorted order', 'Level by level'],
    answer: 2,
  },
  {
    q: 'Level-order traversal is usually built on a…',
    options: ['Stack', 'Queue', 'Hash map', 'Heap'],
    answer: 1,
  },
]

export function QuizDemo() {
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const done = index >= QUESTIONS.length
  const q = QUESTIONS[Math.min(index, QUESTIONS.length - 1)]

  const pick = (i: number) => {
    if (picked !== null) return
    setPicked(i)
    if (i === q.answer) setScore((s) => s + 1)
  }
  const next = () => {
    setPicked(null)
    setIndex((i) => i + 1)
  }
  const restart = () => {
    setIndex(0)
    setPicked(null)
    setScore(0)
  }

  return (
    <div className="flex min-h-[300px] flex-col p-4 sm:p-5">
      <p className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 font-mono text-[10px] font-bold">
        <Sparkles className="size-3 text-amber" /> Generated from Trees &amp; Traversals.pdf
      </p>

      {done ? (
        <div className="demo-pop my-auto text-center">
          <p className="text-5xl font-black">
            {score}
            <span className="text-2xl text-text-muted">/{QUESTIONS.length}</span>
          </p>
          <p className="mt-2 text-sm text-text-secondary">
            {score === QUESTIONS.length
              ? 'Ready for the exam.'
              : 'Worth one more go before the exam.'}
          </p>
          <button
            type="button"
            onClick={restart}
            className={cn(
              'mt-4 rounded-full bg-primary px-4 py-2 text-xs font-black text-primary-foreground',
              press,
            )}
          >
            Retake
          </button>
        </div>
      ) : (
        <>
          <p key={index} className="demo-pop mt-3 text-sm font-black">
            {q.q}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {q.options.map((o, i) => {
              const state =
                picked === null ? 'idle' : i === q.answer ? 'right' : i === picked ? 'wrong' : 'dim'
              return (
                <button
                  key={o}
                  type="button"
                  data-demo={`option-${i}`}
                  onClick={() => pick(i)}
                  disabled={picked !== null}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-left text-sm font-medium transition-colors duration-150',
                    press,
                    state === 'idle' && 'border-border-strong bg-card hover:bg-accent',
                    state === 'right' && 'border-success bg-success/15',
                    state === 'wrong' && 'border-destructive bg-destructive/10',
                    state === 'dim' && 'border-border bg-card opacity-50',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-5 shrink-0 items-center justify-center rounded-full border-2 font-mono text-[10px] font-bold',
                      state === 'right' ? 'border-success bg-success text-white' : 'border-border',
                    )}
                  >
                    {state === 'right' ? <Check className="size-3" /> : 'ABCD'[i]}
                  </span>
                  {o}
                </button>
              )
            })}
          </div>
          <div className="mt-auto flex items-center justify-between pt-4">
            <div className="flex gap-1" aria-label={`Question ${index + 1} of ${QUESTIONS.length}`}>
              {QUESTIONS.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    'h-1.5 w-6 rounded-full',
                    i < index || (i === index && picked !== null)
                      ? 'bg-success'
                      : 'bg-foreground/10',
                  )}
                />
              ))}
            </div>
            <button
              type="button"
              data-demo="next"
              onClick={next}
              disabled={picked === null}
              className={cn(
                'rounded-full bg-primary px-4 py-1.5 text-xs font-black text-primary-foreground disabled:opacity-40',
                press,
              )}
            >
              {index === QUESTIONS.length - 1 ? 'See score' : 'Next →'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ Decks */

const SLIDE_KINDS = [
  'Overview',
  'Key terms',
  'How it works',
  'Worked example',
  'Common mistakes',
  'Quick quiz',
]

export function DecksDemo() {
  const [topic, setTopic] = useState('')
  const [stage, setStage] = useState<'idle' | 'generating' | 'ready'>('idle')
  const [title, setTitle] = useState('')

  useEffect(() => {
    if (stage !== 'generating') return
    const t = setTimeout(() => setStage('ready'), 900)
    return () => clearTimeout(t)
  }, [stage])

  const generate = (e: FormEvent) => {
    e.preventDefault()
    setTitle(topic.trim() || 'Trees & traversals')
    setStage('generating')
  }

  return (
    <div className="flex min-h-[300px] flex-col p-4 sm:p-5">
      <form onSubmit={generate} className="flex flex-col gap-2 sm:flex-row">
        <label className="flex flex-1 items-center gap-2 rounded-xl border-2 border-border-strong bg-card px-3 py-2 focus-within:border-amber">
          <Sparkles className="size-4 shrink-0 text-amber" />
          <input
            data-demo="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Trees & traversals"
            aria-label="Deck topic"
            maxLength={48}
            className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-text-muted"
          />
        </label>
        <button
          type="submit"
          data-demo="generate"
          disabled={stage === 'generating'}
          className={cn(
            'shrink-0 rounded-xl px-4 py-2 text-sm font-black text-white shadow-[3px_3px_0_0_var(--shadow-color)] disabled:opacity-70',
            stage === 'ready' ? 'bg-success' : 'bg-amber',
            press,
          )}
        >
          {stage === 'generating' ? 'Generating…' : stage === 'ready' ? 'Again' : 'Generate'}
        </button>
      </form>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {SLIDE_KINDS.map((kind, i) =>
          stage === 'ready' ? (
            <div
              key={`${title}-${kind}`}
              className={cn(
                'demo-pop aspect-[4/3] rounded-lg border-2 border-border-strong p-2 shadow-[2px_2px_0_0_var(--shadow-color)]',
                i === 0 ? 'bg-amber-subtle' : 'bg-card',
              )}
              style={{ ['--i' as string]: i }}
            >
              <p className="line-clamp-2 text-[10px] font-black leading-tight sm:text-[11px]">
                {i === 0 ? title : kind}
              </p>
              <div className="mt-1.5 space-y-1">
                <div className="h-1 w-full rounded bg-foreground/10" />
                <div className="h-1 w-2/3 rounded bg-foreground/10" />
              </div>
            </div>
          ) : (
            <div
              key={kind}
              className={cn(
                'aspect-[4/3] rounded-lg border-2 border-dashed border-border',
                stage === 'generating' && 'animate-pulse bg-muted',
              )}
            />
          ),
        )}
      </div>
      <p className="mt-auto pt-3 font-mono text-[10px] text-text-muted">
        {stage === 'ready'
          ? '6 slides • edit, download or share a link'
          : 'Type any topic you’re revising, then Generate'}
      </p>
    </div>
  )
}
