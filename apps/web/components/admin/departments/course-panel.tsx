'use client'

import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export type ApiCourse = { id: string; code: string; name: string; yearLevel?: number | null }

interface CoursePanelProps {
  deptName: string | undefined
  courses: ApiCourse[]
  onAddClick: () => void
  onEditClick: (course: ApiCourse) => void
  onDeleteClick: (course: ApiCourse) => void
  isLoading?: boolean
}

export function CoursePanel({
  deptName,
  courses,
  onAddClick,
  onEditClick,
  onDeleteClick,
  isLoading,
}: CoursePanelProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        {isLoading ? (
          <Skeleton className="h-6 w-40 bg-muted" />
        ) : (
          <h2 className="text-lg font-semibold text-foreground">
            {deptName ?? 'Select department'}
          </h2>
        )}
        <Button
          onClick={onAddClick}
          size="sm"
          className="bg-amber text-primary-foreground hover:bg-amber-hover"
        >
          <Plus className="size-3.5" strokeWidth={1.5} />
          Add Course
        </Button>
      </div>
      <div className="overflow-y-auto flex-1">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-3.5 border-b border-border">
              <Skeleton className="h-4 w-16 shrink-0 bg-muted" />
              <Skeleton className="h-4 flex-1 max-w-sm bg-muted" />
            </div>
          ))
        ) : courses.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-mono text-sm text-text-muted">No courses in this department.</p>
          </div>
        ) : (
          courses.map((course) => (
            <div
              key={course.id}
              className="flex items-center gap-4 px-6 py-3.5 border-b border-border hover:bg-muted transition-colors duration-150 group"
            >
              <span className="font-mono text-[13px] text-amber font-medium shrink-0">
                {course.code}
              </span>
              <span className="text-sm text-foreground flex-1 min-w-0 truncate">{course.name}</span>
              {course.yearLevel != null && (
                <span className="font-mono text-[11px] text-text-muted shrink-0">
                  Y{course.yearLevel}
                </span>
              )}
              <div className="invisible group-hover:visible flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Edit course"
                  onClick={() => onEditClick(course)}
                  className="text-text-muted hover:text-foreground hover:bg-muted"
                >
                  <Pencil className="size-3.5" strokeWidth={1.5} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Delete course"
                  onClick={() => onDeleteClick(course)}
                  className="text-text-muted hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-3.5" strokeWidth={1.5} />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
