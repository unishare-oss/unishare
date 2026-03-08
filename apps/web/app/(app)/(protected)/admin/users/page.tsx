'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, ArrowUpDown } from 'lucide-react'
import { authClient } from '@/src/lib/auth/client'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { UsersTable } from '@/components/admin/users/users-table'
import { cn } from '@/lib/utils'

type RoleFilter = 'ALL' | 'STUDENT' | 'MODERATOR' | 'ADMIN' | 'BANNED'
type SortField = 'name' | 'createdAt' | 'role'
type SortDir = 'asc' | 'desc'

const ROLE_FILTERS: RoleFilter[] = ['ALL', 'STUDENT', 'MODERATOR', 'ADMIN', 'BANNED']
const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: 'name', label: 'Name' },
  { field: 'createdAt', label: 'Joined' },
  { field: 'role', label: 'Role' },
]

const ROLE_ORDER: Record<string, number> = { ADMIN: 0, MODERATOR: 1, STUDENT: 2 }

export default function AdminUsersPage() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL')
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const { data, refetch } = useQuery({
    queryKey: ['admin', 'users', search, roleFilter],
    queryFn: async () => {
      const result = await authClient.admin.listUsers({
        query: {
          limit: 200,
          ...(search && { searchField: 'email', searchValue: search }),
          ...(roleFilter !== 'ALL' &&
            roleFilter !== 'BANNED' && { filterField: 'role', filterValue: roleFilter }),
        },
      })
      return result.data
    },
  })

  const allUsers = data?.users ?? []
  const total = data?.total ?? allUsers.length

  const bannedCount = useMemo(() => allUsers.filter((u) => u.banned).length, [allUsers])

  const filteredUsers = useMemo(() => {
    let list = allUsers
    if (roleFilter === 'BANNED') list = list.filter((u) => u.banned)
    return list
  }, [allUsers, roleFilter])

  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      let cmp = 0
      if (sortField === 'name') {
        cmp = (a.name ?? '').localeCompare(b.name ?? '')
      } else if (sortField === 'createdAt') {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      } else if (sortField === 'role') {
        cmp = (ROLE_ORDER[a.role ?? ''] ?? 9) - (ROLE_ORDER[b.role ?? ''] ?? 9)
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filteredUsers, sortField, sortDir])

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="Users"
        large
        subtitle={
          total > 0
            ? `${total.toLocaleString()} total · ${bannedCount > 0 ? `${bannedCount} banned` : 'none banned'}`
            : undefined
        }
      />

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

        <div className="flex items-center gap-1 flex-wrap">
          {ROLE_FILTERS.map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={cn(
                'relative px-3 py-1.5 font-mono text-xs uppercase tracking-wider rounded-[6px] transition-colors',
                roleFilter === r
                  ? 'bg-amber/10 text-amber'
                  : 'text-text-muted hover:text-foreground hover:bg-muted',
              )}
            >
              {r}
              {r === 'BANNED' && bannedCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-destructive/20 text-destructive font-mono text-[9px]">
                  {bannedCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 ml-auto">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.field}
              onClick={() => toggleSort(opt.field)}
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1.5 font-mono text-xs uppercase tracking-wider rounded-[6px] transition-colors',
                sortField === opt.field
                  ? 'bg-muted text-foreground'
                  : 'text-text-muted hover:text-foreground hover:bg-muted',
              )}
            >
              {opt.label}
              <ArrowUpDown
                className={cn(
                  'size-2.5 transition-opacity',
                  sortField === opt.field ? 'opacity-100' : 'opacity-40',
                )}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 bg-card">
        {sortedUsers.length === 0 ? (
          <EmptyState message="No users found." />
        ) : (
          <UsersTable users={sortedUsers} onRefresh={() => refetch()} />
        )}
      </div>
    </div>
  )
}
