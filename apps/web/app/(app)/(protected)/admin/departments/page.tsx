'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useDepartmentsControllerFindAll,
  useDepartmentsControllerCreate,
  getDepartmentsControllerFindAllQueryKey,
} from '@/src/lib/api/generated/departments/departments'
import {
  useCoursesControllerFindAll,
  useCoursesControllerCreate,
  getCoursesControllerFindAllQueryKey,
} from '@/src/lib/api/generated/courses/courses'
import { PageHeader } from '@/components/shared/page-header'
import { DeptPanel } from '@/components/admin/departments/dept-panel'
import { CoursePanel } from '@/components/admin/departments/course-panel'
import { AddDeptModal } from '@/components/admin/departments/add-dept-modal'
import { AddCourseModal } from '@/components/admin/departments/add-course-modal'

export default function AdminDepartmentsPage() {
  const [selectedDeptId, setSelectedDeptId] = useState('')
  const [showAddDept, setShowAddDept] = useState(false)
  const [showAddCourse, setShowAddCourse] = useState(false)
  const [newDeptName, setNewDeptName] = useState('')
  const [newCourseCode, setNewCourseCode] = useState('')
  const [newCourseName, setNewCourseName] = useState('')
  const queryClient = useQueryClient()

  const { data: depts, isLoading: deptsLoading } = useDepartmentsControllerFindAll({
    query: { select: (r) => r.data },
  })

  const effectiveDeptId = selectedDeptId || depts?.[0]?.id || ''

  const { data: coursesData, isLoading: coursesLoading } = useCoursesControllerFindAll(
    { departmentId: effectiveDeptId, limit: 100 },
    { query: { enabled: !!effectiveDeptId, select: (r) => r.data } },
  )

  const { mutate: createDept } = useDepartmentsControllerCreate({
    mutation: {
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: getDepartmentsControllerFindAllQueryKey() }),
    },
  })

  const { mutate: createCourse } = useCoursesControllerCreate({
    mutation: {
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: getCoursesControllerFindAllQueryKey() }),
    },
  })

  const deptCourses = coursesData?.items ?? []
  const selectedDept = depts?.find((d) => d.id === effectiveDeptId)

  return (
    <div className="flex flex-col h-screen">
      <PageHeader title="Departments & Courses" large />

      <div className="flex flex-1 flex-col md:flex-row bg-card overflow-hidden">
        <DeptPanel
          depts={depts ?? []}
          selectedDeptId={effectiveDeptId}
          onSelect={setSelectedDeptId}
          onAddClick={() => {
            setNewDeptName('')
            setShowAddDept(true)
          }}
          isLoading={deptsLoading}
        />
        <CoursePanel
          deptName={selectedDept?.name}
          courses={deptCourses}
          onAddClick={() => {
            setNewCourseCode('')
            setNewCourseName('')
            setShowAddCourse(true)
          }}
          isLoading={coursesLoading}
        />
      </div>

      {showAddDept && (
        <AddDeptModal
          value={newDeptName}
          onChange={setNewDeptName}
          onClose={() => setShowAddDept(false)}
          onSubmit={(name) => createDept({ data: { name } })}
        />
      )}

      {showAddCourse && (
        <AddCourseModal
          code={newCourseCode}
          name={newCourseName}
          onCodeChange={setNewCourseCode}
          onNameChange={setNewCourseName}
          onClose={() => setShowAddCourse(false)}
          onSubmit={(code, name) =>
            createCourse({ data: { code, name, departmentId: effectiveDeptId } })
          }
        />
      )}
    </div>
  )
}
