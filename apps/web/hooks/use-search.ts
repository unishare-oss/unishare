'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ApiPost } from '@/lib/api-types'

interface SearchResult {
  results: ApiPost[]
  total: number
  page: number
  limit: number
}

export function useSearch() {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const debouncedQueryRef = useRef<NodeJS.Timeout | null>(null)
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    if (debouncedQueryRef.current) {
      clearTimeout(debouncedQueryRef.current)
    }
    debouncedQueryRef.current = setTimeout(() => {
      setDebouncedQuery(query)
      setPage(1)
    }, 300)

    return () => {
      if (debouncedQueryRef.current) {
        clearTimeout(debouncedQueryRef.current)
      }
    }
  }, [query])

  const { data, isLoading, error } = useQuery({
    queryKey: ['search', debouncedQuery, page],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return { results: [], total: 0, page: 1, limit: 20 }
      const res = await fetch(
        `/api/posts/search?q=${encodeURIComponent(debouncedQuery)}&page=${page}&limit=20`,
      )
      if (!res.ok) throw new Error('Search failed')
      const json = await res.json()
      return json.data as SearchResult
    },
    enabled: debouncedQuery.trim().length > 0,
  })

  return {
    query,
    setQuery,
    debouncedQuery,
    page,
    setPage,
    results: data?.results || [],
    total: data?.total || 0,
    isLoading,
    error,
  }
}
