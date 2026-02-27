'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { usePostsControllerFindAll } from '@/src/lib/api/generated/posts/posts'
import { FeedHeader } from '@/components/feed/feed-header'
import { FilterStrip, type TypeFilter } from '@/components/feed/filter-strip'
import { PostFeed } from '@/components/feed/post-feed'

export default function FeedPage() {
  const [activeFilter, setActiveFilter] = useState<TypeFilter>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDeptId, setSelectedDeptId] = useState('')
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [page, setPage] = useState(1)

  function handleDeptChange(deptId: string) {
    setSelectedDeptId(deptId)
    setSelectedCourseId('')
    setPage(1)
  }

  function handleFilterChange(filter: TypeFilter) {
    setActiveFilter(filter)
    setPage(1)
  }

  function handleCourseChange(courseId: string) {
    setSelectedCourseId(courseId)
    setPage(1)
  }

  const { data } = usePostsControllerFindAll(
    {
      type: activeFilter !== 'ALL' ? (activeFilter as 'NOTE' | 'OLD_QUESTION') : undefined,
      courseId: selectedCourseId || undefined,
      departmentId: selectedDeptId || undefined,
      page,
      limit: 20,
    },
    { query: { select: (r) => r.data } },
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
        selectedDeptId={selectedDeptId}
        onDeptChange={handleDeptChange}
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
        page={data?.page ?? 1}
        totalPages={data?.totalPages ?? 1}
        onPageChange={setPage}
      />
    </div>
  )
}
