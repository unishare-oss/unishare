'use client'

import { useAuth } from '@/contexts/auth-context'
import { useMyDepartments, NO_UNIVERSITY_MESSAGE } from '@/hooks/use-my-departments'
import { useUniversitiesControllerFindAll } from '@/src/lib/api/generated/universities/universities'
import { PageHeader } from '@/components/shared/page-header'
import { DeptList, DeptListSkeleton } from '@/components/departments/dept-list'

export default function DepartmentsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { departments, isLoading, noUniversity } = useMyDepartments()
  const { data: universities, isLoading: universitiesLoading } = useUniversitiesControllerFindAll({
    // Only for signed-out visitors, once the session has loaded
    query: { enabled: !authLoading && !isAuthenticated, select: (r) => r.data },
  })
  const loading = isLoading || (!isAuthenticated && universitiesLoading)

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Departments" />
      <div className="flex-1 bg-card">
        {loading ? (
          <DeptListSkeleton />
        ) : noUniversity ? (
          <p className="max-w-[700px] mx-auto px-6 py-6 text-sm text-text-muted">
            {NO_UNIVERSITY_MESSAGE}
          </p>
        ) : (
          <DeptList
            departments={departments}
            universities={isAuthenticated ? undefined : (universities ?? [])}
          />
        )}
      </div>
    </div>
  )
}
