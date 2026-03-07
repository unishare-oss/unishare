'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { authClient } from '@/src/lib/auth/client'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { UsersTable } from '@/components/admin/users/users-table'
import { cn } from '@/lib/utils'

type RoleFilter = 'ALL' | 'STUDENT' | 'MODERATOR' | 'ADMIN'

const ROLE_FILTERS: RoleFilter[] = ['ALL', 'STUDENT', 'MODERATOR', 'ADMIN']

export default function AdminUsersPage() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL')

  const { data, refetch } = useQuery({
    queryKey: ['admin', 'users', search, roleFilter],
    queryFn: async () => {
      const result = await authClient.admin.listUsers({
        query: {
          limit: 100,
          ...(search && { searchField: 'email', searchValue: search }),
          ...(roleFilter !== 'ALL' && { filterField: 'role', filterValue: roleFilter }),
        },
      })
      return result.data
    },
  })

  const users = data?.users ?? []

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Users" large />

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-6 py-4 border-b border-border bg-background">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-text-muted"
            strokeWidth={1.5}
          />
          <input
            type="text"
            placeholder="Search by email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-[6px] text-foreground placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-amber"
          />
        </div>

        <div className="flex items-center gap-1">
          {ROLE_FILTERS.map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={cn(
                'px-3 py-1.5 font-mono text-xs uppercase tracking-wider rounded-[6px] transition-colors',
                roleFilter === r
                  ? 'bg-amber/10 text-amber'
                  : 'text-text-muted hover:text-foreground hover:bg-muted',
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 bg-card">
        {users.length === 0 ? (
          <EmptyState message="No users found." />
        ) : (
          <UsersTable users={users} onRefresh={() => refetch()} />
        )}
      </div>
    </div>
  )
}
