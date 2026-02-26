'use client'

import { useState } from 'react'
import { departments, courses } from '@/lib/mock-data'
import { PageHeader } from '@/components/shared/page-header'
import { DeptList } from '@/components/departments/dept-list'
import { CourseList } from '@/components/departments/course-list'

export default function DepartmentsPage() {
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null)
  const selectedDept = departments.find((d) => d.id === selectedDeptId)
  const deptCourses = selectedDeptId ? courses.filter((c) => c.departmentId === selectedDeptId) : []

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Departments" />
      <div className="flex-1 bg-card">
        {!selectedDeptId ? (
          <DeptList departments={departments} onSelect={setSelectedDeptId} />
        ) : (
          <CourseList
            selectedDept={selectedDept!}
            courses={deptCourses}
            onBack={() => setSelectedDeptId(null)}
          />
        )}
      </div>
    </div>
  )
}
