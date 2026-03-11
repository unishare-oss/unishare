'use client'

import { useDepartmentsControllerFindAll } from '@/src/lib/api/generated/departments/departments'
import { PageHeader } from '@/components/shared/page-header'
import { DeptList, DeptListSkeleton } from '@/components/departments/dept-list'

export default function DepartmentsPage() {
  const { data: depts, isLoading } = useDepartmentsControllerFindAll({
    query: { select: (r) => r.data },
  })

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Departments" />
      <div className="flex-1 bg-card">
        {isLoading ? <DeptListSkeleton /> : <DeptList departments={depts ?? []} />}
      </div>
    </div>
  )
}
