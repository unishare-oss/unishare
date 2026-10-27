'use client'

import { useAuth } from '@/contexts/auth-context'
import { useDepartmentsControllerFindAll } from '@/src/lib/api/generated/departments/departments'
import type {
  DepartmentEntity,
  DepartmentFacultyEntity,
} from '@/src/lib/api/generated/unishareAPI.schemas'

export const NO_UNIVERSITY_MESSAGE =
  "Your university isn't set yet. It comes from your uniauth account."

/**
 * Departments of the signed-in user's university. Signed-out visitors get every
 * department; a signed-in user without a university gets none (`noUniversity`).
 */
export function useMyDepartments({ staleTime }: { staleTime?: number } = {}) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const universityId = user?.university?.id
  const enabled = !authLoading && (!isAuthenticated || !!universityId)

  const { data, isLoading } = useDepartmentsControllerFindAll(
    universityId ? { universityId } : undefined,
    { query: { enabled, staleTime, select: (r) => r.data } },
  )

  return {
    departments: enabled ? (data ?? []) : [],
    isLoading: authLoading || (enabled && isLoading),
    // Only once the profile has loaded: a failed profile request is not a missing university.
    noUniversity: !authLoading && !!user && !universityId,
  }
}

export type FacultyGroup<T extends Pick<DepartmentEntity, 'name' | 'faculty'>> = {
  faculty: DepartmentFacultyEntity
  departments: T[]
}

/** Groups by faculty id, sorted by faculty name, then department name. */
export function groupByFaculty<T extends Pick<DepartmentEntity, 'name' | 'faculty'>>(
  departments: T[],
): FacultyGroup<T>[] {
  const groups = new Map<string, FacultyGroup<T>>()
  for (const dept of departments) {
    const group = groups.get(dept.faculty.id)
    if (group) group.departments.push(dept)
    else groups.set(dept.faculty.id, { faculty: dept.faculty, departments: [dept] })
  }
  return [...groups.values()]
    .sort((a, b) => a.faculty.name.localeCompare(b.faculty.name))
    .map((g) => ({
      ...g,
      departments: [...g.departments].sort((a, b) => a.name.localeCompare(b.name)),
    }))
}
