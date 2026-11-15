'use client'

import { useEffect, useRef } from 'react'

/** A thin bar at the top of the window that fills as the note is scrolled. It sits above the phone top bar (z-30). */
export function ReadingBar() {
  const bar = useRef<HTMLElement>(null)

  useEffect(() => {
    function update() {
      const range = document.documentElement.scrollHeight - window.innerHeight
      const progress = range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0
      if (bar.current) bar.current.style.transform = `scaleX(${progress})`
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    // Comments and files load after the first paint and change the page height.
    const observer = new ResizeObserver(update)
    observer.observe(document.body)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      observer.disconnect()
    }
  }, [])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-[env(safe-area-inset-top,0px)] z-40 h-[3px]"
    >
      <i ref={bar} className="block h-full origin-left scale-x-0 bg-brand" />
    </div>
  )
}
