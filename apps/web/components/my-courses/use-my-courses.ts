import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth-context'
import {
  getMyCoursesControllerGetMineQueryKey,
  useMyCoursesControllerGetMine,
  useMyCoursesControllerSaveMine,
} from '@/src/lib/api/generated/users/users'
import { getExamsControllerFindAllQueryKey } from '@/src/lib/api/generated/exams/exams'

/** The student's course list for this academic year; disabled without a department and year. */
export function useMyCourses() {
  const { user } = useAuth()
  const department = user?.department ?? null
  const yearLevel = user?.yearLevel ?? null
  const eligible = !!department && yearLevel !== null
  const { data } = useMyCoursesControllerGetMine({
    query: { select: (response) => response.data, enabled: eligible },
  })
  return { department, yearLevel, data: eligible ? data : undefined }
}

/** Saves the final list; stays pending until the refreshed list has landed. */
export function useSaveMyCourses(successMessage: string, onSaved?: () => void) {
  const queryClient = useQueryClient()
  return useMyCoursesControllerSaveMine({
    mutation: {
      onSuccess: () => {
        onSaved?.()
        toast.success(successMessage)
        return Promise.all([
          queryClient.invalidateQueries({ queryKey: getMyCoursesControllerGetMineQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getExamsControllerFindAllQueryKey() }),
        ])
      },
      onError: () => toast.error('Failed to save courses'),
    },
  })
}
