'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useUsersControllerUpdateAcademicProfile,
  getUsersControllerGetMeQueryKey,
} from '@/src/lib/api/generated/users/users'
import { useDepartmentsControllerFindAll } from '@/src/lib/api/generated/departments/departments'

export function AcademicProfileModal({ onDismiss }: { onDismiss?: () => void }) {
  const queryClient = useQueryClient()
  const [departmentId, setDepartmentId] = useState('')
  const [enrollmentYear, setEnrollmentYear] = useState('')

  const { data: departments } = useDepartmentsControllerFindAll({
    query: { select: (r) => r.data },
  })

  const { mutate, isPending } = useUsersControllerUpdateAcademicProfile({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getUsersControllerGetMeQueryKey() })
        onDismiss?.()
      },
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    mutate({
      data: {
        ...(departmentId && { departmentId }),
        ...(enrollmentYear && { enrollmentYear: parseInt(enrollmentYear) }),
      },
    })
  }

  return (
    <Dialog open>
      <DialogContent className="sm:max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Complete your profile</DialogTitle>
          <DialogDescription>
            Tell us a bit about your academic background. You can update this later in your profile.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-2">
          <Select
            value={departmentId || '_none'}
            onValueChange={(v) => setDepartmentId(v === '_none' ? '' : v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Department (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none" className="text-text-muted">
                Department (optional)
              </SelectItem>
              {(departments ?? []).map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="number"
            placeholder="Enrollment year (e.g. 2023)"
            value={enrollmentYear}
            onChange={(e) => setEnrollmentYear(e.target.value)}
            min={1950}
            max={2100}
          />

          <div className="flex gap-2 mt-1">
            <Button
              type="button"
              variant="ghost"
              className="flex-1 text-text-muted"
              disabled={isPending}
              onClick={() => onDismiss?.()}
            >
              Skip
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
