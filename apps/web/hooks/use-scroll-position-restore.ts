import { useRef, useEffect } from 'react'

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

  const prepareForLoad = () => {
    const scrollContainer = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]')
    if (scrollContainer) {
      previousScrollHeightRef.current = scrollContainer.scrollHeight
      isLoadingMoreRef.current = true
    }
  }

  useEffect(() => {
    if (!isFetchingNextPage && isLoadingMoreRef.current) {
      const scrollContainer = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]')
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
  }, [isFetchingNextPage, delayBeforeNextFetch, scrollRef])

  return {
    prepareForLoad,
    isLoadingMore: isLoadingMoreRef,
  }
}
