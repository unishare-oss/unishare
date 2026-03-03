'use client'

import { useState } from 'react'
import { useDepartmentsControllerFindAll } from '@/src/lib/api/generated/departments/departments'
import { useCoursesControllerFindAll } from '@/src/lib/api/generated/courses/courses'
import { PageHeader } from '@/components/shared/page-header'
import { DeptList } from '@/components/departments/dept-list'
import { CourseList } from '@/components/departments/course-list'

type ApiDept = { id: string; name: string }
type ApiCourse = { id: string; code: string; name: string; departmentId: string }

export default function DepartmentsPage() {
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null)

  const { data: depts } = useDepartmentsControllerFindAll({
    query: { select: (r) => r.data as unknown as ApiDept[] },
  })

  const { data: coursesData } = useCoursesControllerFindAll(
    { limit: 100 },
    { query: { select: (r) => r.data as unknown as { items: ApiCourse[] } } },
  )

  const allCourses = coursesData?.items ?? []

  const deptsWithCount = (depts ?? []).map((d) => ({
    ...d,
    courseCount: allCourses.filter((c) => c.departmentId === d.id).length,
  }))

  const selectedDept = depts?.find((d) => d.id === selectedDeptId)
  const deptCourses = allCourses.filter((c) => c.departmentId === selectedDeptId)

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Departments" />
      <div className="flex-1 bg-card">
        {!selectedDeptId ? (
          <DeptList departments={deptsWithCount} onSelect={setSelectedDeptId} />
        ) : (
          <CourseList
            deptName={selectedDept?.name ?? ''}
            deptId={selectedDeptId}
            courses={deptCourses}
            onBack={() => setSelectedDeptId(null)}
          />
        )}
      </div>
    </div>
  )
}
