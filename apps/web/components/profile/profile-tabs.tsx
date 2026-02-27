'use client'

import { cn } from '@/lib/utils'
import { PostCard } from '@/components/post-card'
import type { ApiPost } from '@/lib/api-types'

export const tabs = ['MY POSTS', 'SAVED POSTS'] as const
export type Tab = (typeof tabs)[number]

interface ProfileTabsProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  posts: ApiPost[]
}

export function ProfileTabs({ activeTab, onTabChange, posts }: ProfileTabsProps) {
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

      <div>
        {posts.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-mono text-sm text-text-muted">
              {activeTab === 'MY POSTS'
                ? "You haven't posted anything yet."
                : 'No saved posts yet.'}
            </p>
          </div>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </>
  )
}
