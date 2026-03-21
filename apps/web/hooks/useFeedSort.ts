'use client'

import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'

type SortType = 'recent' | 'trending'

interface UseFeedSortOptions {
  initialSort?: SortType
  limit?: number
}

export function useFeedSort({ initialSort = 'recent', limit = 20 }: UseFeedSortOptions = {}) {
  const [sort, setSort] = useState<SortType>(initialSort)
  const [page, setPage] = useState(1)

  const endpoint = sort === 'trending' ? '/posts/trending' : '/posts'

  const { data, isLoading, error } = useQuery({
    queryKey: ['feed', sort, page],
    queryFn: async () => {
      const response = await fetch(`/api${endpoint}?page=${page}&limit=${limit}`)
      if (!response.ok) throw new Error('Failed to fetch posts')
      return response.json()
    },
    staleTime: 30000, // 30 seconds
  })

  const handleSortChange = useCallback((newSort: SortType) => {
    setSort(newSort)
    setPage(1) // Reset to first page on sort change
  }, [])

  return {
    posts: data?.data?.posts || [],
    total: data?.data?.total || 0,
    page,
    setPage,
    sort,
    setSortType: handleSortChange,
    isLoading,
    error,
  }
}
