'use client'

import { useEffect, useState } from 'react'

// Re-renders the consumer on an interval so relative timestamps
// ("last seen 2 minutes ago") don't go stale while the view stays mounted.
export function useNowTick(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])

  return now
}
