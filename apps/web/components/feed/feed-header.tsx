'use client'

import { Search, Plus } from 'lucide-react'
import Link from 'next/link'

interface FeedHeaderProps {
  searchQuery: string
  onSearchChange: (value: string) => void
}

export function FeedHeader({ searchQuery, onSearchChange }: FeedHeaderProps) {
  return (
    <header className="sticky top-0 z-20 bg-card px-6 py-4 flex items-center justify-between gap-4">
      <h1 className="text-lg font-semibold text-foreground shrink-0">Feed</h1>
      <div className="flex items-center gap-3 flex-1 justify-end">
        <div className="relative max-w-[280px] flex-1 hidden sm:block">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-muted"
            strokeWidth={1.5}
          />
          <input
            type="text"
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-9 pl-9 pr-3 bg-card border border-border rounded-[6px] text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-amber"
          />
        </div>
        <Link
          href="/posts/new"
          className="inline-flex items-center gap-2 h-9 px-4 bg-amber text-primary-foreground text-sm font-medium rounded-[6px] hover:bg-amber-hover transition-colors duration-150 shrink-0"
        >
          <Plus className="size-4" strokeWidth={1.5} />
          <span className="hidden sm:inline">New Post</span>
        </Link>
      </div>
    </header>
  )
}
