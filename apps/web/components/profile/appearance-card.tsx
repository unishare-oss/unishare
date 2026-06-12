'use client'

import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { useFeedStyleStore, useSettingsStore, type FeedStyle } from '@/lib/store'

interface ThemeOption {
  id: string
  label: string
  bg: string
  card: string
  sidebar: string
  text: string
  accent: string
  border: string
}

const THEMES: ThemeOption[] = [
  {
    id: 'theme-unishare',
    label: 'UniShare',
    bg: '#f7f3ee',
    card: '#ffffff',
    sidebar: '#f7f3ee',
    text: '#1c1917',
    accent: '#d97706',
    border: '#e2dad0',
  },
  {
    id: 'theme-catppuccin-latte',
    label: 'Catppuccin Latte',
    bg: '#eff1f5',
    card: '#e6e9ef',
    sidebar: '#e6e9ef',
    text: '#4c4f69',
    accent: '#fe640b',
    border: '#ccd0da',
  },
  {
    id: 'theme-catppuccin-mocha',
    label: 'Catppuccin Mocha',
    bg: '#1e1e2e',
    card: '#181825',
    sidebar: '#181825',
    text: '#cdd6f4',
    accent: '#fab387',
    border: '#45475a',
  },
  {
    id: 'theme-nord',
    label: 'Nord',
    bg: '#2e3440',
    card: '#3b4252',
    sidebar: '#3b4252',
    text: '#eceff4',
    accent: '#88c0d0',
    border: '#4c566a',
  },
  {
    id: 'theme-arctic',
    label: 'Arctic',
    bg: '#eceff4',
    card: '#e5e9f0',
    sidebar: '#e5e9f0',
    text: '#2e3440',
    accent: '#5e81ac',
    border: '#cdd3de',
  },
  {
    id: 'theme-tokyo-night',
    label: 'Tokyo Night',
    bg: '#1a1b26',
    card: '#16161e',
    sidebar: '#16161e',
    text: '#c0caf5',
    accent: '#7aa2f7',
    border: '#292e42',
  },
  {
    id: 'theme-dracula',
    label: 'Dracula',
    bg: '#282a36',
    card: '#1e1f29',
    sidebar: '#1e1f29',
    text: '#f8f8f2',
    accent: '#ff79c6',
    border: '#44475a',
  },
  {
    id: 'theme-gruvbox-dark',
    label: 'Gruvbox Dark',
    bg: '#282828',
    card: '#1d2021',
    sidebar: '#1d2021',
    text: '#ebdbb2',
    accent: '#d79921',
    border: '#504945',
  },
  {
    id: 'theme-midnight-library',
    label: 'Midnight Library',
    bg: '#0f1117',
    card: '#161b26',
    sidebar: '#0d1020',
    text: '#eaedf5',
    accent: '#e6a817',
    border: '#2a3450',
  },
  {
    id: 'theme-parchment',
    label: 'Parchment',
    bg: '#f8f3e8',
    card: '#fdfaf3',
    sidebar: '#ede8da',
    text: '#2c1f0f',
    accent: '#8b4513',
    border: '#d9cfba',
  },
  {
    id: 'theme-ocean-depth',
    label: 'Ocean Depth',
    bg: '#071526',
    card: '#0a1e38',
    sidebar: '#050f1e',
    text: '#dceeff',
    accent: '#38bdf8',
    border: '#1a3a5c',
  },
  {
    id: 'theme-sakura',
    label: 'Sakura',
    bg: '#fff5f8',
    card: '#ffffff',
    sidebar: '#fff0f5',
    text: '#2d0f1a',
    accent: '#e11d75',
    border: '#f5c5da',
  },
]

function ThemePreview({ t }: { t: ThemeOption }) {
  return (
    <div
      className="w-full h-16 rounded-[4px] overflow-hidden flex"
      style={{ background: t.bg, border: `1px solid ${t.border}` }}
    >
      {/* Sidebar strip */}
      <div
        className="w-6 h-full flex flex-col gap-1 p-1 justify-center"
        style={{ background: t.sidebar, borderRight: `1px solid ${t.border}` }}
      >
        {[1, 0.5, 0.7].map((o, i) => (
          <div
            key={i}
            className="h-1 rounded-full"
            style={{ background: t.accent, opacity: o, width: i === 0 ? '100%' : '70%' }}
          />
        ))}
      </div>
      {/* Content area */}
      <div className="flex-1 flex flex-col gap-1.5 p-2 justify-center">
        <div className="h-1.5 w-3/4 rounded-full" style={{ background: t.text, opacity: 0.6 }} />
        <div className="h-1 w-1/2 rounded-full" style={{ background: t.text, opacity: 0.3 }} />
        <div
          className="h-1.5 w-1/3 rounded-full mt-0.5"
          style={{ background: t.accent, opacity: 0.9 }}
        />
      </div>
    </div>
  )
}

interface FeedStyleOption {
  id: FeedStyle
  label: string
  description: string
}

const FEED_STYLES: FeedStyleOption[] = [
  {
    id: 'arcade',
    label: 'Arcade',
    description: 'Bold cards with chunky borders and playful motion',
  },
  {
    id: 'desk',
    label: 'Desk',
    description: 'Paper sheets scattered across a two-column desk',
  },
  {
    id: 'classic',
    label: 'Classic',
    description: 'Compact list rows for maximum density',
  },
]

function FeedStylePreview({ id }: { id: FeedStyle }) {
  if (id === 'arcade') {
    // Spine card: thick border, left type-colored spine, hard shadow
    return (
      <div className="w-full h-16 rounded-[4px] bg-muted flex items-center justify-center overflow-hidden">
        <div className="w-4/5 h-10 rounded-[6px] border-2 border-border-strong bg-card shadow-[2px_2px_0_0_var(--shadow-color)] flex overflow-hidden">
          <div className="w-3 shrink-0 border-r-2 border-border-strong bg-type-note/30" />
          <div className="flex-1 flex flex-col justify-center gap-1 px-2">
            <div className="h-1.5 w-3/4 rounded-full bg-foreground/60" />
            <div className="h-1 w-1/2 rounded-full bg-foreground/30" />
          </div>
        </div>
      </div>
    )
  }
  if (id === 'desk') {
    // Two tilted paper sheets
    return (
      <div className="w-full h-16 rounded-[4px] bg-muted flex items-center justify-center gap-2 overflow-hidden">
        <div className="w-2/5 h-11 -rotate-3 border border-border-strong/50 bg-card shadow-sm flex flex-col justify-center gap-1 px-2">
          <div className="h-1 w-1/2 rounded-full bg-type-note/60" />
          <div className="h-1.5 w-4/5 rounded-full bg-foreground/50" />
          <div className="h-1 w-2/3 rounded-full bg-foreground/25" />
        </div>
        <div className="w-2/5 h-11 rotate-2 border border-border-strong/50 bg-card shadow-sm flex flex-col justify-center gap-1 px-2">
          <div className="h-1 w-1/2 rounded-full bg-type-exam/60" />
          <div className="h-1.5 w-4/5 rounded-full bg-foreground/50" />
          <div className="h-1 w-2/3 rounded-full bg-foreground/25" />
        </div>
      </div>
    )
  }
  // Classic: flat list rows with separators
  return (
    <div className="w-full h-16 rounded-[4px] bg-card border border-border flex flex-col justify-center overflow-hidden">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            'flex-1 flex flex-col justify-center gap-1 px-2.5',
            i < 2 && 'border-b border-border',
          )}
        >
          <div className="h-1 w-3/4 rounded-full bg-foreground/50" />
          <div className="h-0.5 w-1/2 rounded-full bg-foreground/25" />
        </div>
      ))}
    </div>
  )
}

export function AppearanceCard() {
  const { theme, setTheme } = useTheme()
  const fontSize = useSettingsStore((s) => s.fontSize)
  const feedStyle = useFeedStyleStore((s) => s.feedStyle)
  const setFeedStyle = useFeedStyleStore((s) => s.setFeedStyle)

  return (
    <section className="mb-8">
      <h2 className="font-mono text-[11px] uppercase tracking-wider text-text-muted mb-4">
        Appearance
      </h2>

      {/* Theme Selection */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-foreground mb-3">Theme</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {THEMES.map((t) => {
            const isActive = theme === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t.id)}
                className={cn(
                  'flex flex-col gap-2 rounded-[8px] border-2 p-2.5 text-left transition-all duration-150',
                  isActive
                    ? 'border-amber bg-amber/5'
                    : 'border-border hover:border-amber/40 hover:bg-muted',
                )}
              >
                <ThemePreview t={t} />
                <div className="flex items-center justify-between px-0.5">
                  <span
                    className={cn(
                      'text-xs font-medium truncate transition-colors',
                      isActive ? 'text-amber' : 'text-foreground',
                    )}
                  >
                    {t.label}
                  </span>
                  <span
                    className={cn(
                      'size-3 rounded-full border-2 shrink-0 transition-all',
                      isActive ? 'border-amber bg-amber' : 'border-border',
                    )}
                  />
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Feed Style Selection */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-foreground mb-3">Feed style</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {FEED_STYLES.map((s) => {
            const isActive = feedStyle === s.id
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setFeedStyle(s.id)}
                className={cn(
                  'flex flex-col gap-2 rounded-[8px] border-2 p-2.5 text-left transition-all duration-150',
                  isActive
                    ? 'border-amber bg-amber/5'
                    : 'border-border hover:border-amber/40 hover:bg-muted',
                )}
              >
                <FeedStylePreview id={s.id} />
                <div className="flex items-center justify-between px-0.5">
                  <span
                    className={cn(
                      'text-xs font-medium truncate transition-colors',
                      isActive ? 'text-amber' : 'text-foreground',
                    )}
                  >
                    {s.label}
                  </span>
                  <span
                    className={cn(
                      'size-3 rounded-full border-2 shrink-0 transition-all',
                      isActive ? 'border-amber bg-amber' : 'border-border',
                    )}
                  />
                </div>
                <p className="text-[11px] leading-snug text-text-muted px-0.5">{s.description}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Font Size Selection */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">Font Size</h3>
        <div className="flex gap-2">
          <button
            onClick={() => useSettingsStore.getState().decreaseFontSize()}
            className={cn(
              'flex-1 px-4 py-2 rounded-lg border font-semibold transition-all duration-200 text-xs',
              'border-border text-text-muted hover:border-amber/40 hover:bg-muted',
            )}
          >
            a
          </button>
          <button
            onClick={() => useSettingsStore.getState().increaseFontSize()}
            className={cn(
              'flex-1 px-4 py-2 rounded-lg border font-semibold transition-all duration-200 text-lg',
              'border-border text-text-muted hover:border-amber/40 hover:bg-muted',
            )}
          >
            A
          </button>
        </div>
        <p className="text-xs text-text-muted mt-2">
          {fontSize === 'xsmall' && 'Extra Small'}
          {fontSize === 'small' && 'Small'}
          {fontSize === 'normalsmall' && 'Small-Normal'}
          {fontSize === 'medium' && 'Normal'}
          {fontSize === 'mediumlarge' && 'Normal-Large'}
          {fontSize === 'large' && 'Large'}
          {fontSize === 'xlarge' && 'Extra Large'}
        </p>
      </div>
    </section>
  )
}
