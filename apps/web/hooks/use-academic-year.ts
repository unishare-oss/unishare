'use client'

import { useUsersControllerGetMe } from '@/src/lib/api/generated/users/users'

export function useAcademicYear(): number | null {
  const { data: user } = useUsersControllerGetMe({
    query: { select: (res) => res.data },
  })
  if (!user?.yearLevel || !user?.enrollmentYear) return null
  return user.yearLevel + user.enrollmentYear - 1
}
