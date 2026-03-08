'use client'

import { useDepartmentsControllerFindAll } from '@/src/lib/api/generated/departments/departments'
import { useCoursesControllerFindAll } from '@/src/lib/api/generated/courses/courses'
import { PageHeader } from '@/components/shared/page-header'
import { DeptList } from '@/components/departments/dept-list'

export default function DepartmentsPage() {
  const { data: depts } = useDepartmentsControllerFindAll({
    query: { select: (r) => r.data },
  })

  const { data: coursesData } = useCoursesControllerFindAll(
    { limit: 100 },
    { query: { select: (r) => r.data } },
  )

  const allCourses = coursesData?.items ?? []
  const deptsWithCount = (depts ?? []).map((d) => ({
    ...d,
    courseCount: allCourses.filter((c) => c.departmentId === d.id).length,
  }))

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Departments" />
      <div className="flex-1 bg-card">
        <DeptList departments={deptsWithCount} />
      </div>
    </div>
  )
}
