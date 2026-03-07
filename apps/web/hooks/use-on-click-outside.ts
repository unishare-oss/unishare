import { RefObject, useEffect } from 'react'

export function useOnClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: () => void,
) {
  useEffect(() => {
    function listener(e: MouseEvent | TouchEvent) {
      if (!ref.current || ref.current.contains(e.target as Node)) return
      handler()
    }
    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)
    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [ref, handler])
}
