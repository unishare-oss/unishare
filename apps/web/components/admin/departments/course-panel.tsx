'use client'

import { Plus, Pencil, Trash2 } from 'lucide-react'

export type ApiCourse = { id: string; code: string; name: string }

interface CoursePanelProps {
  deptName: string | undefined
  courses: ApiCourse[]
  onAddClick: () => void
}

export function CoursePanel({ deptName, courses, onAddClick }: CoursePanelProps) {
  return (
    <div className="flex-1">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">{deptName ?? 'Select department'}</h2>
        <button
          onClick={onAddClick}
          className="inline-flex items-center gap-2 h-8 px-4 bg-amber text-primary-foreground text-sm font-medium rounded-[6px] hover:bg-amber-hover transition-colors duration-150"
        >
          <Plus className="size-3.5" strokeWidth={1.5} />
          Add Course
        </button>
      </div>
      <div>
        {courses.length === 0 ? (
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
              <div className="hidden group-hover:flex items-center gap-2 shrink-0">
                <button
                  className="p-1 rounded-[6px] hover:bg-background transition-colors duration-150"
                  aria-label="Edit course"
                >
                  <Pencil className="size-3.5 text-text-muted" strokeWidth={1.5} />
                </button>
                <button
                  className="p-1 rounded-[6px] hover:bg-background transition-colors duration-150"
                  aria-label="Delete course"
                >
                  <Trash2
                    className="size-3.5 text-text-muted hover:text-destructive"
                    strokeWidth={1.5}
                  />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
