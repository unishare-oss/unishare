'use client'

import { useEffect } from 'react'
import { useSettingsStore } from '@/lib/store'

export function FontSizeProvider() {
  const fontSize = useSettingsStore((s) => s.fontSize)

  useEffect(() => {
    const scales: Record<string, string> = {
      xsmall: '0.8',
      small: '0.9',
      normalsmall: '0.95',
      medium: '1',
      mediumlarge: '1.05',
      large: '1.1',
      xlarge: '1.2',
    }

    const scale = scales[fontSize] || '1'
    document.documentElement.style.setProperty('--font-scale', scale)
  }, [fontSize])

  return null
}
