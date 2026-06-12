'use client'

import { cn } from '@/lib/utils'
import { PostFeed } from '@/components/feed/post-feed'
import type { ApiPost } from '@/lib/api-types'

export const tabs = ['MY POSTS', 'SAVED POSTS'] as const
export type Tab = (typeof tabs)[number]

interface ProfileTabsProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  posts: ApiPost[]
  loading?: boolean
}

export function ProfileTabs({ activeTab, onTabChange, posts, loading = false }: ProfileTabsProps) {
  return (
    <>
      <div className="flex items-center gap-1 border-b border-border mb-0">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={cn(
              'font-mono text-xs uppercase tracking-wider px-4 py-3 transition-colors duration-150 border-b-2',
              activeTab === tab
                ? 'border-amber text-amber font-medium'
                : 'border-transparent text-text-muted hover:text-foreground',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex flex-col">
        <PostFeed
          posts={posts}
          page={1}
          totalPages={1}
          onPageChange={() => {}}
          loading={loading}
          emptyMessage={
            activeTab === 'MY POSTS' ? "You haven't posted anything yet." : 'No saved posts yet.'
          }
        />
      </div>
    </>
  )
}
