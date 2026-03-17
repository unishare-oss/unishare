'use client'

import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { keepPreviousData } from '@tanstack/react-query'
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
    setActiveFilter,
    setSelectedDeptId,
    setSelectedYear,
    setSelectedCourseId,
    consumePendingFilter,
  } = useFeedStore()

  useState(() => {
    consumePendingFilter()
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const effectiveDeptId = selectedDeptId ?? user?.department?.id ?? ''

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

  const { data, isLoading } = usePostsControllerFindAll(
    {
      type: activeFilter !== 'ALL' ? activeFilter : undefined,
      courseId: selectedCourseId || undefined,
      departmentId: effectiveDeptId || undefined,
      yearLevel: selectedYear ?? undefined,
      page,
      limit: 10,
    },
    { query: { select: (r) => r.data, placeholderData: keepPreviousData } },
  )

  const items = data?.items ?? []
  const filteredItems = searchQuery
    ? items.filter(
        (p) =>
          p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.course.code.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : items

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
        posts={filteredItems}
        loading={isLoading}
        page={data?.page ?? 1}
        totalPages={data?.totalPages ?? 1}
        onPageChange={setPage}
        emptyDescription="Try adjusting your filters or search query."
      />
    </div>
  )
}
