'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCoursesControllerFindAll } from '@/src/lib/api/generated/courses/courses'

const EMPTY_SELECT_VALUE = '__empty__'

interface CourseStepProps {
  selectedCourse: string
  onCourseChange: (course: string) => void
}

export function CourseStep({ selectedCourse, onCourseChange }: CourseStepProps) {
  const { data: coursesData } = useCoursesControllerFindAll(
    { limit: 100 },
    { query: { select: (r) => r.data } },
  )

  const allCourses = coursesData?.items ?? []

  return (
    <div>
      <h2 className="text-[22px] font-semibold text-foreground mb-6">Which course is this for?</h2>
      <div className="flex flex-col gap-4">
        <div>
          <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
            Course
          </label>
          <Select
            value={selectedCourse || EMPTY_SELECT_VALUE}
            onValueChange={(value) => onCourseChange(value === EMPTY_SELECT_VALUE ? '' : value)}
          >
            <SelectTrigger className="w-full h-[42px] bg-card border-border rounded-[6px] text-sm text-foreground focus-visible:ring-2 focus-visible:ring-amber">
              <SelectValue placeholder="Select course..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={EMPTY_SELECT_VALUE}>Select course...</SelectItem>
              {allCourses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.code} — {course.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
