'use client'

import { useDepartmentsControllerFindAll } from '@/src/lib/api/generated/departments/departments'
import { useCoursesControllerFindAll } from '@/src/lib/api/generated/courses/courses'

type ApiDept = { id: string; name: string }
type ApiCourse = { id: string; code: string; name: string; departmentId: string }

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
          <select
            value={selectedDept}
            onChange={(e) => {
              onDeptChange(e.target.value)
              onCourseChange('')
            }}
            className="w-full h-[42px] px-3 bg-card border border-border rounded-[6px] text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber"
          >
            <option value="">Select department...</option>
            {(depts ?? []).map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>
        {selectedDept && (
          <div>
            <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
              Course
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => onCourseChange(e.target.value)}
              className="w-full h-[42px] px-3 bg-card border border-border rounded-[6px] text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber"
            >
              <option value="">Select course...</option>
              {filteredCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} — {course.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  )
}
