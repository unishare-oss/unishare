import type { DemoStep } from './demo-director'

/**
 * What each landing demo does on its own. Kept out of the 'use client' demos module so the
 * server-rendered section can import the data itself, not a client reference to it.
 * Targets are the demos' `data-demo` names.
 */
export const DEMO_SCRIPTS: Record<
  'share' | 'find' | 'chat' | 'boards' | 'quiz' | 'decks',
  DemoStep[]
> = {
  share: [{ click: 'type-Past paper' }, { wait: 400 }, { click: 'upload' }, { wait: 2000 }],
  find: [
    { type: 'search', text: 'final' },
    { wait: 1400 },
    { click: 'clear' },
    { click: 'year-1' },
    { wait: 700 },
    { click: 'type-Past paper' },
    { wait: 1200 },
  ],
  chat: [{ type: 'message', text: 'Is Q4 on the final?' }, { click: 'send' }, { wait: 2600 }],
  boards: [
    { drag: 'note-2', within: 'board', by: [-10, 42] },
    { click: 'pen' },
    {
      draw: 'board',
      points: [
        [72, 18],
        [62, 34],
        [72, 18],
        [82, 34],
      ],
    },
    { click: 'sticky' },
    { wait: 1200 },
  ],
  quiz: [
    { click: 'option-1' },
    { wait: 900 },
    { click: 'next' },
    { click: 'option-0' },
    { wait: 900 },
    { click: 'next' },
    { click: 'option-1' },
    { wait: 700 },
    { click: 'next' },
    { wait: 1400 },
  ],
  decks: [{ type: 'topic', text: 'Photosynthesis' }, { click: 'generate' }, { wait: 2600 }],
}
