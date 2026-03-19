'use client'

import { useQuery } from '@tanstack/react-query'

export function useTags(query: string = '') {
  const { data, isLoading } = useQuery({
    queryKey: ['tags', query],
    queryFn: async () => {
      if (!query.trim()) {
        const res = await fetch('/api/tags/trending')
        const json = await res.json()
        return json.data || []
      }
      const res = await fetch(`/api/tags/autocomplete?q=${encodeURIComponent(query)}`)
      const json = await res.json()
      return json.data || []
    },
  })

  return {
    suggestions: data || [],
    isLoading,
  }
}
