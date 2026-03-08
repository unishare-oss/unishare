'use client'

import { useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
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

interface AcademicProfileModalProps {
  onDismiss?: () => void
  requireDepartment?: boolean
}

const baseAcademicProfileSchema = z.object({
  departmentId: z.string(),
  enrollmentYear: z
    .string()
    .refine(
      (value) =>
        value === '' || (/^\d+$/.test(value) && Number(value) >= 1950 && Number(value) <= 2100),
      {
        message: 'Enrollment year must be between 1950 and 2100',
      },
    ),
})

type AcademicProfileFormValues = z.infer<typeof baseAcademicProfileSchema>

export function AcademicProfileModal({
  onDismiss,
  requireDepartment = false,
}: AcademicProfileModalProps) {
  const queryClient = useQueryClient()

  const form = useForm<AcademicProfileFormValues>({
    resolver: zodResolver(baseAcademicProfileSchema),
    defaultValues: {
      departmentId: '',
      enrollmentYear: '',
    },
    mode: 'onChange',
  })

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

  const departmentId = form.watch('departmentId')
  const saveDisabled = isPending || (requireDepartment && !departmentId)

  function handleSubmit(values: AcademicProfileFormValues) {
    mutate({
      data: {
        ...(values.departmentId && { departmentId: values.departmentId }),
        ...(values.enrollmentYear && { enrollmentYear: Number(values.enrollmentYear) }),
      },
    })
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && requireDepartment) return
      }}
    >
      <DialogContent
        className="sm:max-w-sm"
        showCloseButton={!requireDepartment}
        onEscapeKeyDown={(e) => {
          if (requireDepartment) e.preventDefault()
        }}
        onInteractOutside={(e) => {
          if (requireDepartment) e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>Complete your profile</DialogTitle>
          <DialogDescription>
            Tell us a bit about your academic background. You can update this later in your profile.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-3 mt-2">
            <FormField
              control={form.control}
              name="departmentId"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Select
                      value={field.value || '_none'}
                      onValueChange={(value) => field.onChange(value === '_none' ? '' : value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={
                            requireDepartment ? 'Select your department' : 'Department (optional)'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none" className="text-text-muted">
                          {requireDepartment ? 'Select your department' : 'Department (optional)'}
                        </SelectItem>
                        {(departments ?? []).map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="enrollmentYear"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enrollment year (e.g. 2023)"
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      min={1950}
                      max={2100}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <div className="flex gap-2 mt-1">
              {!requireDepartment && (
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1 text-text-muted"
                  disabled={isPending}
                  onClick={() => onDismiss?.()}
                >
                  Skip
                </Button>
              )}
              <Button type="submit" className="flex-1" disabled={saveDisabled}>
                {requireDepartment ? 'Continue' : 'Save'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
