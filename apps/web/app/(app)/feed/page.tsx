'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { usePostsControllerFindAll } from '@/src/lib/api/generated/posts/posts'
import { useAuth } from '@/contexts/auth-context'
import { FilterStrip, type SortType } from '@/components/feed/filter-strip'
import { FeedHeader } from '@/components/feed/feed-header'
import { useFeedStore, type TypeFilter } from '@/lib/store'
import { PostFeed } from '@/components/feed/post-feed'
import type { ApiPost } from '@/lib/api-types'

const PAGE_PARAM_MAX = 10000

//validator
function parsePageParam(value: string | null): number {
  if (value === null || !/^\d+$/.test(value)) return 1
  const n = Number(value)
  return Number.isSafeInteger(n) && n >= 1 && n <= PAGE_PARAM_MAX ? n : 1
}

export function stripPage(params: URLSearchParams): string {
  const next = new URLSearchParams(params)
  next.delete('page')
  return next.toString()
}

function FeedContent() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tagParam = searchParams.get('tag')
  const qParam = searchParams.get('q')
  const {
    activeFilter,
    selectedDeptId,
    selectedYear,
    hasSelectedYear,
    selectedCourseId,
    selectedModuleNumber,
    setActiveFilter,
    setSelectedDeptId,
    setSelectedYear,
    setSelectedCourseId,
    setSelectedModuleNumber,
    consumePendingFilter,
  } = useFeedStore()

  const [searchQuery, setSearchQuery] = useState(qParam ?? '')
  const [debouncedSearch, setDebouncedSearch] = useState(qParam ?? '')
  const [sortType, setSortType] = useState<SortType>('recent')
  const page = parsePageParam(searchParams.get('page'))
  const effectiveDeptId = selectedDeptId ?? user?.department?.id ?? ''

  // When user types, clear ?tag= and instantly update ?q= in the URL
  function handleSearchChange(value: string) {
    setSearchQuery(value)
    const q = value.trim()
    if (q) {
      router.replace(`/feed?q=${encodeURIComponent(q)}`, { scroll: false })
    } else {
      router.replace('/feed', { scroll: false })
    }
  }

  // When user picks a tag from autocomplete, switch to tag-filter mode
  function handleTagSelect(tagName: string) {
    setSearchQuery('')
    setDebouncedSearch('')
    router.replace(`/feed?tag=${encodeURIComponent(tagName)}`, { scroll: false })
  }

  function handlePageChange(newPage: number) {
    const params = new URLSearchParams(window.location.search)
    if (newPage === 1) {
      params.delete('page')
    } else {
      params.set('page', String(newPage))
    }
    const qs = params.toString()
    router.push(`/feed${qs ? `?${qs}` : ''}`, { scroll: false })
  }

  function stripPageFromUrl() {
    if (!searchParams.has('page')) return
    const next = stripPage(new URLSearchParams(searchParams))
    router.replace(`/feed${next ? `?${next}` : ''}`, { scroll: false })
  }

  // Debounce the actual search query (API call fires after 300ms pause)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  useEffect(() => {
    if (!hasSelectedYear && user?.yearLevel) {
      setSelectedYear(user.yearLevel)
    }
  }, [hasSelectedYear, setSelectedYear, user?.yearLevel])

  // Consume any cross-page filter set via setPendingFilter() on mount.
  useEffect(() => {
    consumePendingFilter()
  }, [consumePendingFilter])

  // Normalize URL: strip ?page= when the parsed value resolves to page 1
  // so shared links like /feed?page=1 or /feed?page=abc stay consistent
  // with the rendered state.
  useEffect(() => {
    if (page === 1 && searchParams.has('page')) {
      const next = stripPage(new URLSearchParams(searchParams))
      router.replace(`/feed${next ? `?${next}` : ''}`, { scroll: false })
    }
  }, [page, searchParams, router])

  function handleDeptChange(deptId: string) {
    setSelectedDeptId(deptId)
    stripPageFromUrl()
  }

  function handleFilterChange(filter: TypeFilter) {
    setActiveFilter(filter)
    stripPageFromUrl()
  }

  function handleYearChange(year: number | null) {
    setSelectedYear(year)
    stripPageFromUrl()
  }

  function handleCourseChange(courseId: string) {
    setSelectedCourseId(courseId)
    stripPageFromUrl()
  }

  function handleModuleChange(moduleNumber: number | null) {
    setSelectedModuleNumber(moduleNumber)
    stripPageFromUrl()
  }

  function handleSortChange(sort: SortType) {
    setSortType(sort)
    stripPageFromUrl()
  }

  // tagParam drives a tag filter on the regular feed endpoint (fast exact match)
  // debouncedSearch drives the FTS search endpoint
  const tagSlug = tagParam
    ? tagParam
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '')
    : undefined
  const isTagActive = tagSlug != null
  const isSearchActive = !isTagActive && debouncedSearch.trim().length > 0

  const isTrendingActive = sortType === 'trending'

  const { data, isLoading } = usePostsControllerFindAll(
    {
      type: activeFilter !== 'ALL' ? activeFilter : undefined,
      courseId: selectedCourseId || undefined,
      departmentId: effectiveDeptId || undefined,
      yearLevel: selectedYear ?? undefined,
      moduleNumber: selectedModuleNumber ?? undefined,
      tagSlug: tagSlug || undefined,
      page,
      limit: 10,
    },
    {
      query: {
        select: (r) => r.data,
        placeholderData: keepPreviousData,
        enabled: !isSearchActive && !isTrendingActive,
      },
    },
  )

  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ['posts', 'search', debouncedSearch, page],
    queryFn: async () => {
      const res = await fetch(
        `/api/posts/search?q=${encodeURIComponent(debouncedSearch)}&page=${page}&limit=10`,
        { credentials: 'include' },
      )
      if (!res.ok) throw new Error('Search failed')
      const json = await res.json()
      return json.data as { results: ApiPost[]; total: number; page: number; limit: number }
    },
    enabled: isSearchActive,
    placeholderData: keepPreviousData,
  })

  const { data: trendingData, isLoading: trendingLoading } = useQuery({
    queryKey: ['posts', 'trending', page],
    queryFn: async () => {
      const res = await fetch(`/api/posts/trending?page=${page}&limit=10`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to fetch trending posts')
      const json = await res.json()
      return json.data as { posts: ApiPost[]; total: number; page: number; limit: number }
    },
    enabled: isTrendingActive,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 min — scores refresh every 5 min server-side
  })

  const items = isTrendingActive
    ? (trendingData?.posts ?? [])
    : isSearchActive
      ? (searchData?.results ?? [])
      : (data?.items ?? [])
  const totalPages = isTrendingActive
    ? Math.ceil((trendingData?.total ?? 0) / 10)
    : isSearchActive
      ? Math.ceil((searchData?.total ?? 0) / 10)
      : (data?.totalPages ?? 1)

  const loading = isTrendingActive ? trendingLoading : isSearchActive ? searchLoading : isLoading

  return (
    <div className="flex flex-col min-h-screen">
      <FeedHeader
        searchQuery={tagParam !== null ? tagParam : searchQuery}
        onSearchChange={handleSearchChange}
        onTagSelect={handleTagSelect}
      />
      <FilterStrip
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
        selectedDeptId={effectiveDeptId}
        onDeptChange={handleDeptChange}
        selectedYear={selectedYear}
        onYearChange={handleYearChange}
        selectedCourseId={selectedCourseId}
        onCourseChange={handleCourseChange}
        selectedModuleNumber={selectedModuleNumber}
        onModuleChange={handleModuleChange}
        sortType={sortType}
        onSortChange={handleSortChange}
      />

      <PostFeed
        posts={items}
        loading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        emptyDescription={
          isTrendingActive
            ? 'No trending posts yet. Check back soon!'
            : isSearchActive
              ? 'No posts matched your search.'
              : 'Try adjusting your filters or search query.'
        }
      />
    </div>
  )
}

export default function FeedPage() {
  return (
    <Suspense>
      <FeedContent />
    </Suspense>
  )
}
