'use client'

import { Building2, ChevronRight } from 'lucide-react'
import type { Department } from '@/lib/mock-data'

interface DeptListProps {
  departments: Department[]
  onSelect: (id: string) => void
}

export function DeptList({ departments, onSelect }: DeptListProps) {
  return (
    <div className="max-w-[700px] mx-auto px-6 py-6">
      <div className="grid gap-2">
        {departments.map((dept) => (
          <button
            key={dept.id}
            onClick={() => onSelect(dept.id)}
            className="flex items-center gap-4 px-5 py-4 border border-border rounded-[6px] hover:bg-muted transition-colors duration-150 text-left group"
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
          </button>
        ))}
      </div>
    </div>
  )
}
