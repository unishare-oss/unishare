'use client'

import { departments, courses } from '@/lib/mock-data'

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
  const filteredCourses = courses.filter((c) => c.departmentId === selectedDept)

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
            {departments.map((dept) => (
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
