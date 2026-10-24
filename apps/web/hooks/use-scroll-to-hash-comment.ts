import { useEffect } from 'react'

export function useScrollToHashComment(ready: boolean) {
  useEffect(() => {
    if (!ready) return
    const hash = window.location.hash
    if (!hash.startsWith('#comment-')) return
    document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [ready])
}
