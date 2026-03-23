'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useDepartmentsControllerFindAll,
  useDepartmentsControllerCreate,
  useDepartmentsControllerUpdate,
  useDepartmentsControllerRemove,
  getDepartmentsControllerFindAllQueryKey,
} from '@/src/lib/api/generated/departments/departments'
import {
  useCoursesControllerFindAll,
  useCoursesControllerCreate,
  useCoursesControllerUpdate,
  useCoursesControllerRemove,
  getCoursesControllerFindAllQueryKey,
} from '@/src/lib/api/generated/courses/courses'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/page-header'
import { DeptPanel, type ApiDept } from '@/components/admin/departments/dept-panel'
import { CoursePanel, type ApiCourse } from '@/components/admin/departments/course-panel'
import { AddDeptModal } from '@/components/admin/departments/add-dept-modal'
import { AddCourseModal } from '@/components/admin/departments/add-course-modal'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'

export default function AdminDepartmentsPage() {
  const [selectedDeptId, setSelectedDeptId] = useState('')
  const queryClient = useQueryClient()

  // Dept modal state
  const [deptModal, setDeptModal] = useState<{ open: boolean; dept?: ApiDept }>({ open: false })
  const [deptName, setDeptName] = useState('')

  // Course modal state
  const [courseModal, setCourseModal] = useState<{ open: boolean; course?: ApiCourse }>({
    open: false,
  })
  const [courseCode, setCourseCode] = useState('')
  const [courseName, setCourseName] = useState('')
  const [courseYear, setCourseYear] = useState<number | null>(null)

  // Delete confirm state
  const [deleteDept, setDeleteDept] = useState<ApiDept | null>(null)
  const [deleteCourse, setDeleteCourse] = useState<ApiCourse | null>(null)

  const { data: depts, isLoading: deptsLoading } = useDepartmentsControllerFindAll({
    query: { select: (r) => r.data },
  })

  const effectiveDeptId = selectedDeptId || depts?.[0]?.id || ''

  const { data: coursesData, isLoading: coursesLoading } = useCoursesControllerFindAll(
    { departmentId: effectiveDeptId, limit: 100 },
    { query: { enabled: !!effectiveDeptId, select: (r) => r.data } },
  )

  const invalidateDepts = () =>
    queryClient.invalidateQueries({ queryKey: getDepartmentsControllerFindAllQueryKey() })
  const invalidateCourses = () =>
    queryClient.invalidateQueries({ queryKey: getCoursesControllerFindAllQueryKey() })

  const { mutate: createDept } = useDepartmentsControllerCreate({
    mutation: { onSuccess: invalidateDepts },
  })
  const { mutate: updateDept } = useDepartmentsControllerUpdate({
    mutation: { onSuccess: invalidateDepts },
  })
  const { mutate: removeDept, isPending: removingDept } = useDepartmentsControllerRemove({
    mutation: {
      onSuccess: () => {
        invalidateDepts()
        setDeleteDept(null)
      },
    },
  })

  const { mutate: createCourse } = useCoursesControllerCreate({
    mutation: { onSuccess: invalidateCourses },
  })
  const { mutate: updateCourse } = useCoursesControllerUpdate({
    mutation: { onSuccess: invalidateCourses },
  })
  const { mutate: removeCourse, isPending: removingCourse } = useCoursesControllerRemove({
    mutation: {
      onSuccess: () => {
        invalidateCourses()
        setDeleteCourse(null)
      },
      onError: (err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to delete course'
        toast.error(message)
      },
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
            setDeptName('')
            setDeptModal({ open: true })
          }}
          onEditClick={(dept) => {
            setDeptName(dept.name)
            setDeptModal({ open: true, dept })
          }}
          onDeleteClick={setDeleteDept}
          isLoading={deptsLoading}
        />
        <CoursePanel
          deptName={selectedDept?.name}
          courses={deptCourses}
          onAddClick={() => {
            setCourseCode('')
            setCourseName('')
            setCourseYear(null)
            setCourseModal({ open: true })
          }}
          onEditClick={(course) => {
            setCourseCode(course.code)
            setCourseName(course.name)
            setCourseYear(course.yearLevel ?? null)
            setCourseModal({ open: true, course })
          }}
          onDeleteClick={setDeleteCourse}
          isLoading={coursesLoading}
        />
      </div>

      <AddDeptModal
        open={deptModal.open}
        value={deptName}
        onChange={setDeptName}
        editMode={!!deptModal.dept}
        onClose={() => setDeptModal({ open: false })}
        onSubmit={(name) => {
          if (deptModal.dept) {
            updateDept({ id: deptModal.dept.id, data: { name } })
          } else {
            createDept({ data: { name } })
          }
        }}
      />

      <AddCourseModal
        open={courseModal.open}
        code={courseCode}
        name={courseName}
        yearLevel={courseYear}
        editMode={!!courseModal.course}
        onCodeChange={setCourseCode}
        onNameChange={setCourseName}
        onYearChange={setCourseYear}
        onClose={() => setCourseModal({ open: false })}
        onSubmit={(code, name, yearLevel) => {
          if (courseModal.course) {
            updateCourse({ id: courseModal.course.id, data: { code, name, yearLevel } })
          } else {
            createCourse({ data: { code, name, yearLevel, departmentId: effectiveDeptId } })
          }
        }}
      />

      <ConfirmDialog
        open={!!deleteDept}
        onOpenChange={(open) => !open && setDeleteDept(null)}
        title="Delete department?"
        description={`This will permanently delete "${deleteDept?.name}" and all its courses.`}
        confirmLabel="Delete"
        isPending={removingDept}
        onConfirm={() => deleteDept && removeDept({ id: deleteDept.id })}
      />

      <ConfirmDialog
        open={!!deleteCourse}
        onOpenChange={(open) => !open && setDeleteCourse(null)}
        title="Delete course?"
        description={`This will permanently delete "${deleteCourse?.code} — ${deleteCourse?.name}".`}
        confirmLabel="Delete"
        isPending={removingCourse}
        onConfirm={() => deleteCourse && removeCourse({ id: deleteCourse.id })}
      />
    </div>
  )
}
