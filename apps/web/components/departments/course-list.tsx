'use client'

import type { Department, Course } from '@/lib/mock-data'

interface CourseListProps {
  selectedDept: Department
  courses: Course[]
  onBack: () => void
}

export function CourseList({ selectedDept, courses, onBack }: CourseListProps) {
  return (
    <div className="max-w-[700px] mx-auto px-6 py-6">
      <button
        onClick={onBack}
        className="font-mono text-xs text-text-muted hover:text-foreground transition-colors duration-150 mb-4"
      >
        {'< Back to departments'}
      </button>
      <h2 className="text-xl font-semibold text-foreground mb-4">{selectedDept.name}</h2>
      <div className="flex flex-col gap-2">
        {courses.map((course) => (
          <div
            key={course.id}
            className="flex items-center gap-4 px-5 py-3.5 border border-border rounded-[6px]"
          >
            <span className="font-mono text-[13px] text-amber font-medium shrink-0">
              {course.code}
            </span>
            <span className="text-sm text-foreground flex-1 min-w-0 truncate">{course.name}</span>
            <span className="font-mono text-xs text-text-muted shrink-0">
              {course.postCount} posts
            </span>
          </div>
        ))}
        {courses.length === 0 && (
          <p className="font-mono text-sm text-text-muted py-8 text-center">
            No courses in this department.
          </p>
        )}
      </div>
    </div>
  )
}
