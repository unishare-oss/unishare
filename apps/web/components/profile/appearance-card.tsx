'use client'

import { useTheme } from '@unishare-oss/unitheme/react'
import { isDarkTheme } from '@unishare-oss/unitheme'
import { cn } from '@/lib/utils'
import { DARK_THEME, LIGHT_THEME } from '@/lib/theme'
import { useSettingsStore } from '@/lib/store'
import { playMessageSound } from '@/lib/chat-sound'
import { Switch } from '@/components/ui/switch'

export function AppearanceCard() {
  const { theme, setTheme } = useTheme()
  const dark = isDarkTheme(theme)
  const fontSize = useSettingsStore((s) => s.fontSize)
  const chatSoundEnabled = useSettingsStore((s) => s.chatSoundEnabled)
  const setChatSoundEnabled = useSettingsStore((s) => s.setChatSoundEnabled)

  return (
    <section className="mb-8">
      <div className="mb-8">
        <h3 className="text-sm font-medium text-foreground mb-3">Theme</h3>
        <div role="group" aria-label="Theme" className="grid grid-cols-2 gap-3">
          {(
            [
              { id: LIGHT_THEME, label: 'Light', pressed: !dark },
              { id: DARK_THEME, label: 'Dark', pressed: dark },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={option.pressed}
              onClick={() => setTheme(option.id)}
              className={cn(
                'rounded-(--r-s) border-2 px-4 py-3 text-sm font-medium transition-all duration-150',
                option.pressed
                  ? 'border-brand bg-brand-soft text-foreground'
                  : 'border-border text-muted-foreground hover:border-brand/40 hover:bg-muted',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* App-specific preferences remain in UniShare. */}
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
