'use client'

import { useState } from 'react'
import { departments as initialDepts, courses as initialCourses } from '@/lib/mock-data'
import { PageHeader } from '@/components/shared/page-header'
import { DeptPanel } from '@/components/admin/departments/dept-panel'
import { CoursePanel } from '@/components/admin/departments/course-panel'
import { AddDeptModal } from '@/components/admin/departments/add-dept-modal'
import { AddCourseModal } from '@/components/admin/departments/add-course-modal'

export default function AdminDepartmentsPage() {
  const [selectedDeptId, setSelectedDeptId] = useState(initialDepts[0].id)
  const depts = initialDepts
  const allCourses = initialCourses
  const [showAddDept, setShowAddDept] = useState(false)
  const [showAddCourse, setShowAddCourse] = useState(false)
  const [newDeptName, setNewDeptName] = useState('')
  const [newCourseCode, setNewCourseCode] = useState('')
  const [newCourseName, setNewCourseName] = useState('')

  const selectedDept = depts.find((d) => d.id === selectedDeptId)
  const deptCourses = allCourses.filter((c) => c.departmentId === selectedDeptId)

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Departments & Courses" large />

      <div className="flex-1 flex flex-col md:flex-row bg-card">
        <DeptPanel
          depts={depts}
          selectedDeptId={selectedDeptId}
          onSelect={setSelectedDeptId}
          onAddClick={() => setShowAddDept(true)}
        />
        <CoursePanel
          selectedDept={selectedDept}
          courses={deptCourses}
          onAddClick={() => setShowAddCourse(true)}
        />
      </div>

      {showAddDept && (
        <AddDeptModal
          value={newDeptName}
          onChange={setNewDeptName}
          onClose={() => setShowAddDept(false)}
        />
      )}

      {showAddCourse && (
        <AddCourseModal
          code={newCourseCode}
          name={newCourseName}
          onCodeChange={setNewCourseCode}
          onNameChange={setNewCourseName}
          onClose={() => setShowAddCourse(false)}
        />
      )}
    </div>
  )
}
