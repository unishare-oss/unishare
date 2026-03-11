'use client'

import Link from 'next/link'
import { Building2, ChevronRight } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

export type ApiDept = { id: string; name: string; courseCount: number }

export function DeptListSkeleton() {
  return (
    <div className="max-w-[700px] mx-auto px-6 py-6">
      <div className="grid gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-5 py-4 border border-border rounded-[6px]"
          >
            <Skeleton className="w-10 h-10 rounded-[6px] shrink-0 bg-muted" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-48 bg-amber-subtle" />
              <Skeleton className="h-3 w-20 bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DeptList({ departments }: { departments: ApiDept[] }) {
  return (
    <div className="max-w-[700px] mx-auto px-6 py-6">
      <div className="grid gap-2">
        {departments.map((dept) => (
          <Link
            key={dept.id}
            href={`/departments/${dept.id}`}
            className="flex items-center gap-4 px-5 py-4 border border-border rounded-[6px] hover:bg-muted transition-colors duration-150 group"
          >
            <div className="w-10 h-10 rounded-[6px] bg-muted flex items-center justify-center shrink-0">
              <Building2 className="size-5 text-text-muted" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{dept.name}</p>
              <p className="font-mono text-xs text-text-muted">{dept.courseCount} courses</p>
            </div>
            <ChevronRight
              className="size-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity duration-150"
              strokeWidth={1.5}
            />
          </Link>
        ))}
      </div>
    </div>
  )
}
