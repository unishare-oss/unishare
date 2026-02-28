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

type ApiDept = { id: string; name: string }
type ApiCourse = { id: string; code: string; name: string; departmentId: string }

export default function AdminDepartmentsPage() {
  const [selectedDeptId, setSelectedDeptId] = useState('')
  const [showAddDept, setShowAddDept] = useState(false)
  const [showAddCourse, setShowAddCourse] = useState(false)
  const [newDeptName, setNewDeptName] = useState('')
  const [newCourseCode, setNewCourseCode] = useState('')
  const [newCourseName, setNewCourseName] = useState('')
  const queryClient = useQueryClient()

  const { data: depts } = useDepartmentsControllerFindAll({
    query: { select: (r) => r.data as unknown as ApiDept[] },
  })

  const effectiveDeptId = selectedDeptId || depts?.[0]?.id || ''

  const { data: coursesData } = useCoursesControllerFindAll(
    { limit: 100 },
    { query: { select: (r) => r.data as unknown as { items: ApiCourse[] } } },
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

  const allCourses = coursesData?.items ?? []
  const deptCourses = allCourses.filter((c) => c.departmentId === effectiveDeptId)
  const selectedDept = depts?.find((d) => d.id === effectiveDeptId)

  const deptsWithCount = (depts ?? []).map((d) => ({
    ...d,
    courseCount: allCourses.filter((c) => c.departmentId === d.id).length,
  }))

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Departments & Courses" large />

      <div className="flex-1 flex flex-col md:flex-row bg-card">
        <DeptPanel
          depts={deptsWithCount}
          selectedDeptId={effectiveDeptId}
          onSelect={setSelectedDeptId}
          onAddClick={() => {
            setNewDeptName('')
            setShowAddDept(true)
          }}
        />
        <CoursePanel
          deptName={selectedDept?.name}
          courses={deptCourses}
          onAddClick={() => {
            setNewCourseCode('')
            setNewCourseName('')
            setShowAddCourse(true)
          }}
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
