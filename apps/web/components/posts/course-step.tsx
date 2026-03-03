'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDepartmentsControllerFindAll } from '@/src/lib/api/generated/departments/departments'
import { useCoursesControllerFindAll } from '@/src/lib/api/generated/courses/courses'

type ApiDept = { id: string; name: string }
type ApiCourse = { id: string; code: string; name: string; departmentId: string }

const EMPTY_SELECT_VALUE = '__empty__'

interface CourseStepProps {
  selectedDept: string
  selectedCourse: string
  onDeptChange: (dept: string) => void
  onCourseChange: (course: string) => void
}

export function CourseStep({
  selectedDept,
  selectedCourse,
  onDeptChange,
  onCourseChange,
}: CourseStepProps) {
  const { data: depts } = useDepartmentsControllerFindAll({
    query: { select: (r) => r.data as unknown as ApiDept[] },
  })

  const { data: coursesData } = useCoursesControllerFindAll(
    { limit: 100 },
    { query: { select: (r) => r.data as unknown as { items: ApiCourse[] } } },
  )

  const allCourses = coursesData?.items ?? []
  const filteredCourses = selectedDept
    ? allCourses.filter((c) => c.departmentId === selectedDept)
    : []

  return (
    <div>
      <h2 className="text-[22px] font-semibold text-foreground mb-6">Which course is this for?</h2>
      <div className="flex flex-col gap-4">
        <div>
          <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
            Department
          </label>
          <Select
            value={selectedDept || EMPTY_SELECT_VALUE}
            onValueChange={(value) => {
              onDeptChange(value === EMPTY_SELECT_VALUE ? '' : value)
              onCourseChange('')
            }}
          >
            <SelectTrigger className="w-full h-[42px] bg-card border-border rounded-[6px] text-sm text-foreground focus-visible:ring-2 focus-visible:ring-amber">
              <SelectValue placeholder="Select department..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={EMPTY_SELECT_VALUE}>Select department...</SelectItem>
              {(depts ?? []).map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedDept && (
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
                {filteredCourses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.code} — {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  )
}
