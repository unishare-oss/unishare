'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  ClipboardCheck,
  LayoutDashboard,
  MessageCircle,
  Presentation,
  Search,
  UploadCloud,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DemoDirector } from './demo-director'
import { DEMO_SCRIPTS } from './demo-scripts'
import { BoardsDemo, ChatDemo, DecksDemo, FindDemo, QuizDemo, ShareDemo } from './landing-demos'

type Feature = {
  id: keyof typeof DEMO_SCRIPTS
  icon: LucideIcon
  tone: string
  title: string
  body: string
  hint: string
  href: string
  cta: string
  Demo: () => React.ReactNode
}

const FEATURES: Feature[] = [
  {
    id: 'share',
    icon: UploadCloud,
    tone: 'bg-type-note',
    title: 'Share it once',
    body: 'Upload a note or past paper and it lands sorted by course and year.',
    hint: 'pick a type and upload',
    href: '/posts/new',
    cta: 'Share a file',
    Demo: ShareDemo,
  },
  {
    id: 'find',
    icon: Search,
    tone: 'bg-success',
    title: 'Find it in seconds',
    body: 'Search or filter by year and type — last year’s paper is right there.',
    hint: 'search or flip the filters',
    href: '/feed',
    cta: 'Browse the feed',
    Demo: FindDemo,
  },
  {
    id: 'chat',
    icon: MessageCircle,
    tone: 'bg-info',
    title: 'Ask your cohort',
    body: 'End-to-end encrypted course chats, right next to the files.',
    hint: 'send a message, someone answers',
    href: '/chat',
    cta: 'Open chat',
    Demo: ChatDemo,
  },
  {
    id: 'boards',
    icon: LayoutDashboard,
    tone: 'bg-type-exam',
    title: 'Sketch it out',
    body: 'A shared whiteboard with sticky notes, drawing and live cursors.',
    hint: 'drag the notes, or draw with the pen',
    href: '/boards',
    cta: 'Try Boards',
    Demo: BoardsDemo,
  },
  {
    id: 'quiz',
    icon: ClipboardCheck,
    tone: 'bg-type-exercise',
    title: 'Test yourself',
    body: 'Practice quizzes generated from your notes. Attempts stay private.',
    hint: 'pick an answer',
    href: '/quizzes',
    cta: 'Explore quizzes',
    Demo: QuizDemo,
  },
  {
    id: 'decks',
    icon: Presentation,
    tone: 'bg-amber',
    title: 'Revise with a deck',
    body: 'Type a topic, get a slide deck you can edit, download or share.',
    hint: 'type a topic and press Generate',
    href: '/decks',
    cta: 'Make a deck',
    Demo: DecksDemo,
  },
]

/**
 * One stage, one feature at a time. The stage plays the selected feature's demo and then
 * moves to the next; picking a feature jumps there, and using a demo stops the tour.
 */
export function LandingFeatureTour() {
  const [active, setActive] = useState(0)
  const [touring, setTouring] = useState(true)
  const feature = FEATURES[active]
  const { Demo } = feature

  // Nav links like #boards land on the tour and open that feature.
  useEffect(() => {
    const open = () => {
      const i = FEATURES.findIndex((f) => `#${f.id}` === window.location.hash)
      if (i >= 0) setActive(i)
    }
    open()
    window.addEventListener('hashchange', open)
    return () => window.removeEventListener('hashchange', open)
  }, [])

  return (
    <div className="relative mt-10 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-10">
      {FEATURES.map((f) => (
        <span key={f.id} id={f.id} aria-hidden className="absolute -top-24" />
      ))}
      <ol
        className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0"
        aria-label="Features"
      >
        {FEATURES.map((f, i) => {
          const on = i === active
          const Icon = f.icon
          return (
            <li key={f.id} className="shrink-0 snap-start lg:shrink">
              <button
                type="button"
                aria-pressed={on}
                onClick={() => setActive(i)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-2xl border-2 px-3 py-2.5 text-left transition-colors duration-150 lg:items-start lg:py-3',
                  on
                    ? 'border-border-strong bg-card shadow-[4px_4px_0_0_var(--shadow-color)]'
                    : 'border-transparent hover:bg-card/60',
                )}
              >
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-xl text-white',
                    on ? f.tone : 'bg-foreground/10 text-text-secondary',
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block whitespace-nowrap text-sm font-black lg:whitespace-normal">
                    {f.title}
                  </span>
                  <span
                    className={cn(
                      'hidden text-sm leading-relaxed text-text-secondary',
                      on && 'lg:mt-1 lg:block',
                    )}
                  >
                    {f.body}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>

      <div>
        <div className="rounded-[20px] border-2 border-border-strong bg-card p-2 shadow-[6px_6px_0_0_var(--shadow-color)] sm:p-3">
          <div className="overflow-hidden rounded-xl border border-border bg-background">
            <DemoDirector
              key={feature.id}
              script={DEMO_SCRIPTS[feature.id]}
              hint={feature.hint}
              onFinish={touring ? () => setActive((i) => (i + 1) % FEATURES.length) : undefined}
              onTakeOver={() => setTouring(false)}
            >
              <div className="flex min-h-[320px] flex-col justify-center">
                <Demo />
              </div>
            </DemoDirector>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-4 px-1">
          <p className="text-sm text-text-secondary lg:hidden">{feature.body}</p>
          <Link
            href={feature.href}
            className="inline-flex shrink-0 items-center gap-1 text-sm font-bold hover:underline lg:ml-auto"
          >
            {feature.cta} <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
