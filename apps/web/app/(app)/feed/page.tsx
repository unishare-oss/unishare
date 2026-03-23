'use client'

import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { usePostsControllerFindAll } from '@/src/lib/api/generated/posts/posts'
import { useAuth } from '@/contexts/auth-context'
import { FilterStrip } from '@/components/feed/filter-strip'
import { FeedHeader } from '@/components/feed/feed-header'
import { useFeedStore, type TypeFilter } from '@/lib/store'
import { PostFeed } from '@/components/feed/post-feed'

export default function FeedPage() {
  const { user } = useAuth()
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

  useState(() => {
    consumePendingFilter()
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const effectiveDeptId = selectedDeptId ?? user?.department?.id ?? ''

  // Debounce search query — 300ms after last keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  useEffect(() => {
    if (!hasSelectedYear && user?.yearLevel) {
      setSelectedYear(user.yearLevel)
    }
  }, [hasSelectedYear, setSelectedYear, user?.yearLevel])

  function handleDeptChange(deptId: string) {
    setSelectedDeptId(deptId)
    setPage(1)
  }

  function handleFilterChange(filter: TypeFilter) {
    setActiveFilter(filter)
    setPage(1)
  }

  function handleYearChange(year: number | null) {
    setSelectedYear(year)
    setPage(1)
  }

  function handleCourseChange(courseId: string) {
    setSelectedCourseId(courseId)
    setPage(1)
  }

  function handleModuleChange(moduleNumber: number | null) {
    setSelectedModuleNumber(moduleNumber)
    setPage(1)
  }

  const isSearchActive = debouncedSearch.trim().length > 0

  const { data, isLoading } = usePostsControllerFindAll(
    {
      type: activeFilter !== 'ALL' ? activeFilter : undefined,
      courseId: selectedCourseId || undefined,
      departmentId: effectiveDeptId || undefined,
      yearLevel: selectedYear ?? undefined,
      moduleNumber: selectedModuleNumber ?? undefined,
      page,
      limit: 10,
    },
    {
      query: { select: (r) => r.data, placeholderData: keepPreviousData, enabled: !isSearchActive },
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
      return json.data as { results: any[]; total: number; page: number; limit: number }
    },
    enabled: isSearchActive,
    placeholderData: keepPreviousData,
  })

  const items = isSearchActive ? (searchData?.results ?? []) : (data?.items ?? [])
  const totalPages = isSearchActive
    ? Math.ceil((searchData?.total ?? 0) / 10)
    : (data?.totalPages ?? 1)
  const currentPage = isSearchActive ? (searchData?.page ?? 1) : (data?.page ?? 1)
  const loading = isSearchActive ? searchLoading : isLoading

  return (
    <div className="flex flex-col min-h-screen">
      <FeedHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} />
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
      />

      {/* Mobile search */}
      <div className="sm:hidden px-4 py-3 bg-card">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-muted"
            strokeWidth={1.5}
          />
          <input
            type="text"
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 bg-card border border-border rounded-[6px] text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-amber"
          />
        </div>
      </div>

      <PostFeed
        posts={items}
        loading={loading}
        page={currentPage}
        totalPages={totalPages}
        onPageChange={setPage}
        emptyDescription={
          isSearchActive
            ? 'No posts matched your search.'
            : 'Try adjusting your filters or search query.'
        }
      />
    </div>
  )
}
