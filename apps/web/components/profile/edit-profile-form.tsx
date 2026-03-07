'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useDepartmentsControllerFindAll } from '@/src/lib/api/generated/departments/departments'
import {
  useUsersControllerUpdateMe,
  useUsersControllerUpdateAcademicProfile,
  getUsersControllerGetMeQueryKey,
} from '@/src/lib/api/generated/users/users'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface EditProfileFormProps {
  displayName: string
  bio: string
  department: string
  enrollmentYear: string
  onDisplayNameChange: (value: string) => void
  onBioChange: (value: string) => void
  onDepartmentChange: (value: string) => void
  onEnrollmentYearChange: (value: string) => void
}

export function EditProfileForm({
  displayName,
  bio,
  department,
  enrollmentYear,
  onDisplayNameChange,
  onBioChange,
  onDepartmentChange,
  onEnrollmentYearChange,
}: EditProfileFormProps) {
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const queryClient = useQueryClient()

  const { data: depts } = useDepartmentsControllerFindAll({
    query: { select: (r) => r.data },
  })

  const { mutateAsync: updateMe } = useUsersControllerUpdateMe()
  const { mutateAsync: updateAcademic } = useUsersControllerUpdateAcademicProfile()

  async function handleSave() {
    setSaving(true)
    setSuccess(false)
    try {
      await Promise.all([
        updateMe({
          data: {
            name: displayName,
            bio: bio || undefined,
            enrollmentYear: enrollmentYear ? Number(enrollmentYear) : undefined,
          },
        }),
        updateAcademic({ data: { departmentId: department || null } }),
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
      <div className="flex flex-col gap-5">
        <div>
          <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
            Display Name
          </label>
          <Input
            type="text"
            value={displayName}
            onChange={(e) => onDisplayNameChange(e.target.value)}
          />
        </div>
        <div>
          <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
            Bio
          </label>
          <Textarea
            value={bio}
            onChange={(e) => onBioChange(e.target.value)}
            placeholder="Tell others a bit about yourself..."
            className="resize-none placeholder:text-text-muted/50"
            rows={3}
            maxLength={300}
          />
          <p className="text-xs text-text-muted mt-1.5">{bio.length}/300</p>
        </div>
        <div>
          <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
            Department
          </label>
          <Select
            value={department || '_none'}
            onValueChange={(v) => onDepartmentChange(v === '_none' ? '' : v)}
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
        </div>
        <div>
          <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
            Enrollment Year
          </label>
          <Input
            type="number"
            placeholder="e.g. 2024"
            value={enrollmentYear}
            onChange={(e) => onEnrollmentYearChange(e.target.value)}
            className="placeholder:text-text-muted/50"
          />
          <p className="text-xs text-text-muted mt-1.5">Used to calculate your year level</p>
        </div>
        <div className="flex items-center justify-end gap-3">
          {success && <p className="text-xs text-green-500">Profile saved successfully</p>}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-amber text-primary-foreground hover:bg-amber-hover"
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  )
}
