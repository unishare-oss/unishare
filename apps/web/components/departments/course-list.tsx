'use client'

import { useRouter } from 'next/navigation'
import { useFeedStore } from '@/lib/store'
import { Button } from '@/components/ui/button'

export type ApiCourse = { id: string; code: string; name: string }

interface CourseListProps {
  deptName: string
  deptId: string
  courses: ApiCourse[]
  onBack: () => void
}

export function CourseList({ deptName, deptId, courses, onBack }: CourseListProps) {
  const router = useRouter()
  const setPendingFilter = useFeedStore((s) => s.setPendingFilter)

  function handleCourseClick(courseId: string) {
    setPendingFilter(deptId, courseId)
    router.push('/')
  }

  return (
    <div className="max-w-[700px] mx-auto px-6 py-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="font-mono text-xs text-text-muted mb-4"
      >
        {'< Back to departments'}
      </Button>
      <h2 className="text-xl font-semibold text-foreground mb-4">{deptName}</h2>
      <div className="flex flex-col gap-2">
        {courses.map((course) => (
          <button
            key={course.id}
            onClick={() => handleCourseClick(course.id)}
            className="flex items-center gap-4 px-5 py-3.5 border border-border rounded-[6px] hover:border-amber/50 transition-colors duration-150 text-left w-full cursor-pointer"
          >
            <span className="font-mono text-[13px] text-amber font-medium shrink-0">
              {course.code}
            </span>
            <span className="text-sm text-foreground flex-1 min-w-0 truncate">{course.name}</span>
          </button>
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
