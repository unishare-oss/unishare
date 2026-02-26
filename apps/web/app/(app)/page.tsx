'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { posts } from '@/lib/mock-data'
import { FeedHeader } from '@/components/feed/feed-header'
import { FilterStrip, type TypeFilter } from '@/components/feed/filter-strip'
import { PostFeed } from '@/components/feed/post-feed'

export default function FeedPage() {
  const [activeFilter, setActiveFilter] = useState<TypeFilter>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredPosts = posts.filter((post) => {
    if (post.status !== 'APPROVED') return false
    const matchesType =
      activeFilter === 'ALL' ||
      (activeFilter === 'NOTES' && post.type === 'NOTE') ||
      (activeFilter === 'PAST EXAMS' && post.type === 'PAST EXAM')
    const matchesSearch =
      searchQuery === '' ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.courseCode.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesType && matchesSearch
  })

  return (
    <div className="flex flex-col min-h-screen">
      <FeedHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      <FilterStrip activeFilter={activeFilter} onFilterChange={setActiveFilter} />

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

      <PostFeed posts={filteredPosts} />
    </div>
  )
}
