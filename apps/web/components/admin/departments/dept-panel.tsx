'use client'

import { Plus, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ApiDept = { id: string; name: string; courseCount: number }

interface DeptPanelProps {
  depts: ApiDept[]
  selectedDeptId: string
  onSelect: (id: string) => void
  onAddClick: () => void
}

export function DeptPanel({ depts, selectedDeptId, onSelect, onAddClick }: DeptPanelProps) {
  return (
    <div className="md:w-80 border-b md:border-b-0 md:border-r border-border shrink-0">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-text-muted">
            Departments
          </span>
          <span className="font-mono text-[10px] bg-muted text-text-muted px-1.5 py-0.5 rounded-[4px]">
            {depts.length}
          </span>
        </div>
        <button
          onClick={onAddClick}
          className="p-1.5 rounded-[6px] hover:bg-muted transition-colors duration-150"
          aria-label="Add department"
        >
          <Plus className="size-4 text-text-muted" strokeWidth={1.5} />
        </button>
      </div>
      <div className="flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible">
        {depts.map((dept) => (
          <button
            key={dept.id}
            onClick={() => onSelect(dept.id)}
            className={cn(
              'group flex items-center justify-between px-5 py-3 text-left transition-colors duration-150 border-b border-border whitespace-nowrap md:whitespace-normal shrink-0 md:shrink',
              selectedDeptId === dept.id ? 'bg-amber-subtle' : 'hover:bg-muted',
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-sm shrink-0 transition-colors duration-150',
                  selectedDeptId === dept.id ? 'bg-amber' : 'bg-transparent',
                )}
              />
              <span
                className={cn(
                  'text-sm',
                  selectedDeptId === dept.id ? 'font-medium text-amber' : 'text-foreground',
                )}
              >
                {dept.name}
              </span>
            </div>
            <div className="flex items-center gap-2 ml-3">
              <span className="font-mono text-xs text-text-muted">{dept.courseCount} courses</span>
              <div className="hidden group-hover:flex items-center gap-1">
                <Pencil
                  className="size-3.5 text-text-muted hover:text-foreground"
                  strokeWidth={1.5}
                />
                <Trash2
                  className="size-3.5 text-text-muted hover:text-destructive"
                  strokeWidth={1.5}
                />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
