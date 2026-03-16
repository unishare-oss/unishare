'use client'

import { Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type ApiDept = { id: string; name: string; courseCount: number }

interface DeptPanelProps {
  depts: ApiDept[]
  selectedDeptId: string
  onSelect: (id: string) => void
  onAddClick: () => void
  onEditClick: (dept: ApiDept) => void
  onDeleteClick: (dept: ApiDept) => void
  isLoading?: boolean
}

export function DeptPanel({
  depts,
  selectedDeptId,
  onSelect,
  onAddClick,
  onEditClick,
  onDeleteClick,
  isLoading,
}: DeptPanelProps) {
  return (
    <div className="md:w-80 border-b md:border-b-0 md:border-r border-border shrink-0 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-text-muted">
            Departments
          </span>
          {isLoading ? (
            <Skeleton className="h-4 w-6 rounded-[4px] bg-muted" />
          ) : (
            <span className="font-mono text-[10px] bg-muted text-text-muted px-1.5 py-0.5 rounded-[4px]">
              {depts.length}
            </span>
          )}
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onAddClick} aria-label="Add department">
          <Plus className="size-4 text-text-muted" strokeWidth={1.5} />
        </Button>
      </div>
      <div className="flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible overflow-y-auto flex-1">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-5 py-3.5 border-b border-border"
              >
                <Skeleton className="h-3.5 w-32 bg-muted" />
                <Skeleton className="h-3 w-16 bg-muted" />
              </div>
            ))
          : depts.map((dept) => (
              <div
                key={dept.id}
                onClick={() => onSelect(dept.id)}
                className={cn(
                  'group flex items-center justify-between px-5 py-3 text-left transition-colors duration-150 border-b border-border whitespace-nowrap md:whitespace-normal shrink-0 md:shrink cursor-pointer',
                  selectedDeptId === dept.id ? 'bg-amber-subtle' : 'hover:bg-muted',
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={cn(
                      'w-1.5 h-1.5 rounded-sm shrink-0 transition-colors duration-150',
                      selectedDeptId === dept.id ? 'bg-amber' : 'bg-transparent',
                    )}
                  />
                  <span
                    className={cn(
                      'text-sm truncate',
                      selectedDeptId === dept.id ? 'font-medium text-amber' : 'text-foreground',
                    )}
                  >
                    {dept.name}
                  </span>
                </div>
                <div className="flex items-center ml-2 shrink-0">
                  <span className="font-mono text-xs text-text-muted group-hover:invisible">
                    {dept.courseCount}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Department options"
                        className="invisible group-hover:visible text-text-muted hover:text-foreground hover:bg-muted"
                      >
                        <MoreHorizontal className="size-4" strokeWidth={1.5} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" side="bottom">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          onEditClick(dept)
                        }}
                      >
                        <Pencil className="size-3.5 mr-2" strokeWidth={1.5} />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteClick(dept)
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="size-3.5 mr-2" strokeWidth={1.5} />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
      </div>
    </div>
  )
}
