'use client'

import { ThemePicker } from '@unishare-oss/unitheme/react'
import { cn } from '@/lib/utils'
import { useFeedStyleStore, useSettingsStore, type FeedStyle } from '@/lib/store'
import { playMessageSound } from '@/lib/chat-sound'
import { Switch } from '@/components/ui/switch'

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
  { id: 'desk', label: 'Desk', description: 'Paper sheets scattered across a two-column desk' },
  { id: 'classic', label: 'Classic', description: 'Compact list rows for maximum density' },
]

function FeedStylePreview({ id }: { id: FeedStyle }) {
  if (id === 'arcade') {
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
  const fontSize = useSettingsStore((s) => s.fontSize)
  const chatSoundEnabled = useSettingsStore((s) => s.chatSoundEnabled)
  const setChatSoundEnabled = useSettingsStore((s) => s.setChatSoundEnabled)
  const feedStyle = useFeedStyleStore((s) => s.feedStyle)
  const setFeedStyle = useFeedStyleStore((s) => s.setFeedStyle)

  return (
    <section className="mb-8">
      <div className="mb-8">
        <ThemePicker />
      </div>

      {/* App-specific preferences remain in UniShare. */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-foreground mb-1">Feed style</h3>
        <p className="text-xs text-text-muted mb-3">Applies to the feed and post pages alike.</p>
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

      <div className="mb-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-medium text-foreground mb-1">Message sound</h3>
            <p className="text-xs text-text-muted">
              Play a subtle chime when a chat message arrives.
            </p>
          </div>
          <Switch
            checked={chatSoundEnabled}
            onCheckedChange={(checked) => {
              setChatSoundEnabled(checked)
              if (checked) playMessageSound()
            }}
            aria-label="Toggle chat message sound"
          />
        </div>
      </div>

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
