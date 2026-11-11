'use client'

import { useEffect, useState } from 'react'

export function ReadingBar() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const update = () => {
      const page = document.documentElement
      const range = page.scrollHeight - window.innerHeight
      setProgress(range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return (
    <div
      className="fixed inset-x-0 top-0 z-50 h-1 bg-transparent"
      aria-hidden="true"
      role="presentation"
    >
      <div className="h-full origin-left bg-brand" style={{ transform: `scaleX(${progress})` }} />
    </div>
  )
}
