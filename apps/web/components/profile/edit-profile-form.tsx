'use client'

import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
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
import { useMyDepartments } from '@/hooks/use-my-departments'
import { DepartmentSelectItems } from '@/components/departments/department-select-items'
import { uniauthAccountURL, uniauthPickUniversityURL } from '@/src/lib/auth/mode'

interface EditProfileFormProps {
  user: UserProfileEntity
  /** A guest edits only the bio: it has no academic profile (the API refuses it). */
  isGuest?: boolean
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

export function EditProfileForm({ user, isGuest = false }: EditProfileFormProps) {
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const queryClient = useQueryClient()
  const form = useForm<EditProfileValues>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      name: user.name,
      bio: user.bio ?? '',
      departmentId: user.department?.id ?? '',
      enrollmentYear: user.enrollmentYear != null ? String(user.enrollmentYear) : '',
    },
    mode: 'onChange',
  })

  useEffect(() => {
    form.reset({
      name: user.name,
      bio: user.bio ?? '',
      departmentId: user.department?.id ?? '',
      enrollmentYear: user.enrollmentYear != null ? String(user.enrollmentYear) : '',
    })
  }, [form, user.bio, user.department?.id, user.enrollmentYear, user.name])

  const { departments } = useMyDepartments()
  const university = user.university

  const { mutateAsync: updateMe } = useUsersControllerUpdateMe()
  const { mutateAsync: updateAcademic } = useUsersControllerUpdateAcademicProfile()
  const bioValue = useWatch({ control: form.control, name: 'bio' })

  async function handleSave(values: EditProfileValues) {
    setSaving(true)
    setSuccess(false)
    // Only send the department the user picked here: an untouched one may predate university
    // scoping, and the API rejects a department outside the user's university.
    const departmentChanged = values.departmentId !== (user.department?.id ?? '')
    try {
      await Promise.all([
        updateMe({
          data: {
            name: values.name,
            bio: values.bio || undefined,
          },
        }),
        isGuest ||
          updateAcademic({
            data: {
              ...(departmentChanged && { departmentId: values.departmentId || null }),
              enrollmentYear: values.enrollmentYear ? Number(values.enrollmentYear) : null,
            },
          }),
      ])

      await queryClient.invalidateQueries({ queryKey: getUsersControllerGetMeQueryKey() })
      setSuccess(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border border-border rounded-[6px] p-6 bg-card mb-8 overflow-hidden">
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
                  {/* The name comes from the unicorp account at every sign-in. */}
                  <Input type="text" {...field} disabled />
                </FormControl>
                <p className="text-xs text-text-muted">Change it in your unicorp account.</p>
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

          {!isGuest && (
            <>
              {/* The university comes from the unicorp account at sign-in; it is picked there. */}
              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted mb-1.5">
                  University
                </p>
                {university ? (
                  <>
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm text-foreground truncate">{university.name}</p>
                      <a
                        href={uniauthAccountURL('/profile')}
                        className="text-xs text-text-muted underline hover:text-foreground shrink-0"
                      >
                        Change on unicorp
                      </a>
                    </div>
                    <p className="text-xs text-text-muted mt-1.5">From your unicorp account.</p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm text-text-secondary">
                        You haven&rsquo;t picked your university yet.
                      </p>
                      <Button variant="outline" size="sm" asChild>
                        <a href={uniauthPickUniversityURL('/profile')}>Pick your university</a>
                      </Button>
                    </div>
                    <p className="text-xs text-text-muted mt-1.5">
                      It&rsquo;s saved on your unicorp account and used across unicorp apps.
                    </p>
                  </>
                )}
              </div>

              <FormField
                control={form.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem className="min-w-0">
                    <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
                      Department
                    </label>
                    <FormControl>
                      <Select
                        // Empty while there's no university, so the placeholder explains why.
                        value={university ? field.value || '_none' : ''}
                        onValueChange={(v) => field.onChange(v === '_none' ? '' : v)}
                        disabled={!university}
                      >
                        <SelectTrigger className="w-full min-w-0">
                          <SelectValue
                            placeholder={university ? 'None' : 'Pick your university first'}
                          />
                        </SelectTrigger>
                        <SelectContent
                          position="popper"
                          className="w-[var(--radix-select-trigger-width)]"
                        >
                          <SelectItem value="_none" className="text-text-muted">
                            None
                          </SelectItem>
                          <DepartmentSelectItems departments={departments} />
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
                    <p className="text-xs text-text-muted mt-1.5">
                      Used to calculate your year level
                    </p>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </>
          )}

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
