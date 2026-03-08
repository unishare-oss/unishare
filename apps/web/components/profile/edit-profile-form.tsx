'use client'

import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useDepartmentsControllerFindAll } from '@/src/lib/api/generated/departments/departments'
import {
  useUsersControllerUpdateMe,
  useUsersControllerUpdateAcademicProfile,
  getUsersControllerGetMeQueryKey,
} from '@/src/lib/api/generated/users/users'
import type { UserProfileEntity } from '@/src/lib/api/generated/unishareAPI.schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface EditProfileFormProps {
  user: UserProfileEntity
}

const editProfileSchema = z.object({
  name: z.string().max(100),
  bio: z.string().max(300),
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

type EditProfileValues = z.infer<typeof editProfileSchema>

export function EditProfileForm({ user }: EditProfileFormProps) {
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const queryClient = useQueryClient()
  const form = useForm<EditProfileValues>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      name: user.name,
      bio: user.bio ?? '',
      departmentId: user.departmentId ?? '',
      enrollmentYear: user.enrollmentYear != null ? String(user.enrollmentYear) : '',
    },
    mode: 'onChange',
  })

  useEffect(() => {
    form.reset({
      name: user.name,
      bio: user.bio ?? '',
      departmentId: user.departmentId ?? '',
      enrollmentYear: user.enrollmentYear != null ? String(user.enrollmentYear) : '',
    })
  }, [form, user.bio, user.departmentId, user.enrollmentYear, user.name])

  const { data: depts } = useDepartmentsControllerFindAll({
    query: { select: (r) => r.data },
  })

  const { mutateAsync: updateMe } = useUsersControllerUpdateMe()
  const { mutateAsync: updateAcademic } = useUsersControllerUpdateAcademicProfile()
  const bioValue = form.watch('bio')

  async function handleSave(values: EditProfileValues) {
    setSaving(true)
    setSuccess(false)
    try {
      await Promise.all([
        updateMe({
          data: {
            name: values.name,
            bio: values.bio || undefined,
          },
        }),
        updateAcademic({
          data: {
            departmentId: values.departmentId || null,
            enrollmentYear: values.enrollmentYear ? Number(values.enrollmentYear) : null,
          },
        }),
      ])

      await queryClient.invalidateQueries({ queryKey: getUsersControllerGetMeQueryKey() })
      setSuccess(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border border-border rounded-[6px] p-6 bg-card mb-8">
      <div className="border-b border-border pb-3 mb-5">
        <h3 className="font-mono text-[11px] uppercase tracking-wider text-text-muted">Profile</h3>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)} className="flex flex-col gap-5">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
                  Display Name
                </label>
                <FormControl>
                  <Input type="text" {...field} />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
                  Bio
                </label>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Tell others a bit about yourself..."
                    className="resize-none placeholder:text-text-muted/50"
                    rows={3}
                    maxLength={300}
                  />
                </FormControl>
                <p className="text-xs text-text-muted mt-1.5">{bioValue.length}/300</p>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="departmentId"
            render={({ field }) => (
              <FormItem>
                <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
                  Department
                </label>
                <FormControl>
                  <Select
                    value={field.value || '_none'}
                    onValueChange={(v) => field.onChange(v === '_none' ? '' : v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none" className="text-text-muted">
                        None
                      </SelectItem>
                      {(depts ?? []).map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
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
                <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
                  Enrollment Year
                </label>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g. 2024"
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    className="placeholder:text-text-muted/50"
                  />
                </FormControl>
                <p className="text-xs text-text-muted mt-1.5">Used to calculate your year level</p>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <div className="flex items-center justify-end gap-3">
            {success && <p className="text-xs text-green-500">Profile saved successfully</p>}
            <Button
              type="submit"
              disabled={saving}
              className="bg-amber text-primary-foreground hover:bg-amber-hover"
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
