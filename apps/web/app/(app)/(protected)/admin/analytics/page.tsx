'use client'

import { useStatsControllerGetStats } from '@/src/lib/api/generated/stats/stats'
import { PageHeader } from '@/components/shared/page-header'
import { UserAvatar } from '@/components/shared/user-avatar'
import { cn, pluralize } from '@/lib/utils'
import { Eye, FileText, MessageSquare, SmilePlus, Users } from 'lucide-react'
import Link from 'next/link'

function StatCard({
  label,
  value,
  icon: Icon,
  loading,
  highlight,
}: {
  label: string
  value?: number
  icon: React.ElementType
  loading: boolean
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        'bg-card border border-border rounded-[8px] p-5 flex items-center gap-4',
        highlight && 'border-destructive/40',
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center size-10 rounded-[6px]',
          highlight ? 'bg-destructive/10' : 'bg-muted',
        )}
      >
        <Icon className={cn('size-5', highlight ? 'text-destructive' : 'text-text-muted')} />
      </div>
      <div>
        {loading ? (
          <div className="h-6 w-16 bg-muted animate-pulse rounded mb-1" />
        ) : (
          <p className="text-2xl font-semibold tabular-nums">{value?.toLocaleString()}</p>
        )}
        <p className="font-mono text-xs text-text-muted uppercase tracking-wider">{label}</p>
      </div>
    </div>
  )
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3 px-4">
          <div className="h-4 bg-muted animate-pulse rounded flex-1" />
          <div className="h-4 w-12 bg-muted animate-pulse rounded" />
        </div>
      ))}
    </div>
  )
}

export default function AdminAnalyticsPage() {
  const { data: stats, isLoading } = useStatsControllerGetStats({
    query: { select: (r) => r.data },
  })

  return (
    <div className="flex flex-col h-full overflow-auto">
      <PageHeader title="Analytics" subtitle="Platform overview and top content" />

      <div className="p-6 space-y-8">
        {/* Overview cards */}
        <section>
          <h2 className="font-mono text-xs uppercase tracking-wider text-text-muted mb-3">
            Overview
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard
              label="Users"
              value={stats?.overview.totalUsers}
              icon={Users}
              loading={isLoading}
            />
            <StatCard
              label="Posts"
              value={stats?.overview.totalPosts}
              icon={FileText}
              loading={isLoading}
            />
            <StatCard
              label="Pending"
              value={stats?.overview.pendingPosts}
              icon={FileText}
              loading={isLoading}
              highlight={(stats?.overview.pendingPosts ?? 0) > 0}
            />
            <StatCard
              label="Comments"
              value={stats?.overview.totalComments}
              icon={MessageSquare}
              loading={isLoading}
            />
            <StatCard
              label="Reactions"
              value={stats?.overview.totalReactions}
              icon={SmilePlus}
              loading={isLoading}
            />
          </div>
        </section>

        {/* Top content tables */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top posts by views */}
          <section className="bg-card border border-border rounded-[8px] overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <Eye className="size-4 text-text-muted" />
              <h2 className="font-mono text-xs uppercase tracking-wider text-text-muted">
                Top by views
              </h2>
            </div>
            {isLoading ? (
              <TableSkeleton />
            ) : stats?.topPostsByViews.length === 0 ? (
              <p className="font-mono text-xs text-text-muted p-4">No posts yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {stats?.topPostsByViews.map((post) => (
                  <Link
                    key={post.id}
                    href={`/posts/${post.id}`}
                    className="flex items-center justify-between gap-3 py-3 px-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{post.title}</p>
                      <p className="font-mono text-[11px] text-text-muted truncate">
                        {post.authorName}
                      </p>
                    </div>
                    <span className="font-mono text-xs text-text-muted shrink-0">
                      {post.views.toLocaleString()} {pluralize(post.views, 'view')}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Top posts by reactions */}
          <section className="bg-card border border-border rounded-[8px] overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <SmilePlus className="size-4 text-text-muted" />
              <h2 className="font-mono text-xs uppercase tracking-wider text-text-muted">
                Top by reactions
              </h2>
            </div>
            {isLoading ? (
              <TableSkeleton />
            ) : stats?.topPostsByReactions.length === 0 ? (
              <p className="font-mono text-xs text-text-muted p-4">No posts yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {stats?.topPostsByReactions.map((post) => (
                  <Link
                    key={post.id}
                    href={`/posts/${post.id}`}
                    className="flex items-center justify-between gap-3 py-3 px-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{post.title}</p>
                      <p className="font-mono text-[11px] text-text-muted truncate">
                        {post.authorName}
                      </p>
                    </div>
                    <span className="font-mono text-xs text-text-muted shrink-0">
                      {post.reactionCount} {pluralize(post.reactionCount, 'reaction')}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Top users */}
          <section className="bg-card border border-border rounded-[8px] overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <Users className="size-4 text-text-muted" />
              <h2 className="font-mono text-xs uppercase tracking-wider text-text-muted">
                Most active users
              </h2>
            </div>
            {isLoading ? (
              <TableSkeleton />
            ) : stats?.topUsers.length === 0 ? (
              <p className="font-mono text-xs text-text-muted p-4">No users yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {stats?.topUsers.map((user) => (
                  <Link
                    key={user.id}
                    href={`/users/${user.id}`}
                    className="flex items-center justify-between gap-3 py-3 px-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <UserAvatar
                        name={user.name}
                        image={user.image}
                        size="sm"
                        className="shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{user.name}</p>
                        <p className="font-mono text-[11px] text-text-muted truncate">
                          {user.departmentName ?? '—'}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-xs text-text-muted shrink-0">
                      {user.postCount} {pluralize(user.postCount, 'post')}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
