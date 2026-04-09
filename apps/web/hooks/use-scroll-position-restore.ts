import { useRef, useEffect, useCallback } from 'react'

interface UseScrollPositionRestoreOptions {
  scrollRef: React.RefObject<HTMLDivElement | null>
  isFetchingNextPage: boolean
  delayBeforeNextFetch?: number
}

/**
 * Hook to preserve scroll position when loading older messages in infinite scroll
 * Prevents the viewport from jumping when new content is added at the top
 */
export function useScrollPositionRestore({
  scrollRef,
  isFetchingNextPage,
  delayBeforeNextFetch = 300,
}: UseScrollPositionRestoreOptions) {
  const previousScrollHeightRef = useRef<number>(0)
  const isLoadingMoreRef = useRef(false)

  // Helper to find the scroll viewport element
  const getScrollViewport = useCallback((el: HTMLDivElement | null) => {
    if (!el) return null
    // If the element itself is the viewport, return it
    if (
      el.hasAttribute('data-radix-scroll-area-viewport') ||
      el.getAttribute('data-slot') === 'scroll-area-viewport'
    ) {
      return el
    }
    // Otherwise look for it inside
    return el.querySelector(
      '[data-radix-scroll-area-viewport], [data-slot="scroll-area-viewport"]',
    ) as HTMLDivElement | null
  }, [])

  const prepareForLoad = useCallback(() => {
    const scrollContainer = getScrollViewport(scrollRef.current)
    if (scrollContainer) {
      previousScrollHeightRef.current = scrollContainer.scrollHeight
      isLoadingMoreRef.current = true
    }
  }, [getScrollViewport, scrollRef])

  useEffect(() => {
    if (!isFetchingNextPage && isLoadingMoreRef.current) {
      const scrollContainer = getScrollViewport(scrollRef.current)
      if (scrollContainer) {
        const currentScrollHeight = scrollContainer.scrollHeight
        const heightDifference = currentScrollHeight - previousScrollHeightRef.current

        // Adjust scroll position to maintain visual position
        if (heightDifference > 0) {
          scrollContainer.scrollTop += heightDifference
        }

        // Wait before allowing next fetch to avoid immediate retrigger
        setTimeout(() => {
          isLoadingMoreRef.current = false
        }, delayBeforeNextFetch)
      }
    }
  }, [isFetchingNextPage, delayBeforeNextFetch, scrollRef, getScrollViewport])

  return {
    prepareForLoad,
    isLoadingMore: isLoadingMoreRef,
  }
}
