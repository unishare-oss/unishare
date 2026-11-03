'use client'

import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useUniversitiesControllerFindAll } from '@/src/lib/api/generated/universities/universities'
import {
  getUsersControllerGetMeQueryKey,
  useUsersControllerSetGuestUniversity,
} from '@/src/lib/api/generated/users/users'

/** Shown instead of page content to a guest who hasn't picked the university it browses. */
export function GuestUniversityPicker() {
  const queryClient = useQueryClient()
  const { data: universities, isLoading } = useUniversitiesControllerFindAll({
    query: { select: (r) => r.data },
  })
  const { mutate, isPending, variables } = useUsersControllerSetGuestUniversity({
    mutation: {
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: getUsersControllerGetMeQueryKey() }),
      onError: () => {
        toast.error('Could not pick that university. Please try again.')
        // A 409 means it was already picked (another tab): reload the profile to move on.
        queryClient.invalidateQueries({ queryKey: getUsersControllerGetMeQueryKey() })
      },
    },
  })

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6">
      <h1 className="text-xl font-semibold text-foreground">Pick a university to browse</h1>
      <p className="text-sm text-text-muted">
        As a guest you can read one university&rsquo;s posts. You pick it once; sign out to start
        over with another.
      </p>
      <ul className="flex flex-col gap-2">
        {isLoading &&
          Array.from({ length: 3 }, (_, i) => (
            <li key={i}>
              <Skeleton className="h-10 w-full" />
            </li>
          ))}
        {universities?.map((university) => (
          <li key={university.id}>
            <Button
              variant="outline"
              className="w-full justify-start"
              disabled={isPending}
              onClick={() => mutate({ data: { universityId: university.id } })}
            >
              {isPending && variables?.data.universityId === university.id
                ? 'Picking…'
                : `${university.name} (${university.shortName})`}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
