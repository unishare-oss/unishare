'use client'

import { Moon, Sun } from 'lucide-react'
import { isDarkTheme, type ThemeId } from '@unishare-oss/unitheme'
import { useTheme } from '@unishare-oss/unitheme/react'
import { cn } from '@/lib/utils'

/** The two themes shipped for now. Dark is catppuccin-mocha, whose .dark class gives our dark tokens. */
export const LIGHT_THEME: ThemeId = 'theme-unishare'
export const DARK_THEME: ThemeId = 'theme-catppuccin-mocha'

/** Switches between LIGHT_THEME and DARK_THEME through unitheme, so account sync keeps working. */
export function ThemeToggle({
  collapsed = false,
  className,
}: {
  collapsed?: boolean
  className?: string
}) {
  const { theme, setTheme } = useTheme()
  const dark = isDarkTheme(theme)
  const label = dark ? 'Switch to light theme' : 'Switch to dark theme'
  const Icon = dark ? Sun : Moon
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => setTheme(dark ? LIGHT_THEME : DARK_THEME)}
      className={cn(
        'flex min-h-11 w-full items-center gap-3 rounded-xl border-2 border-transparent px-3 text-text-muted outline-none transition-[color,background-color] duration-200 motion-reduce:transition-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50',
        collapsed && 'w-11 justify-center px-0',
        className,
      )}
    >
      <Icon className="size-5 shrink-0" strokeWidth={1.5} />
      {!collapsed && <span className="truncate text-sm font-semibold">{label}</span>}
    </button>
  )
}
