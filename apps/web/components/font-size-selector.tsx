'use client'

import { Type } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { useSettingsStore } from '@/lib/store'

export function FontSizeSelector() {
  const fontSize = useSettingsStore((s) => s.fontSize)
  const setFontSize = useSettingsStore((s) => s.setFontSize)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-text-muted hover:text-foreground"
          aria-label="Font size settings"
        >
          <Type className="size-4" strokeWidth={1.5} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => setFontSize('small')}
          className={fontSize === 'small' ? 'bg-muted' : ''}
        >
          <span className="text-xs">Small</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setFontSize('medium')}
          className={fontSize === 'medium' ? 'bg-muted' : ''}
        >
          <span className="text-sm">Medium</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setFontSize('large')}
          className={fontSize === 'large' ? 'bg-muted' : ''}
        >
          <span className="text-base">Large</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setFontSize('xlarge')}
          className={fontSize === 'xlarge' ? 'bg-muted' : ''}
        >
          <span className="text-lg">Extra Large</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
