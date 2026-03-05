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

interface EditProfileFormProps {
  displayName: string
  department: string
  enrollmentYear: string
  onDisplayNameChange: (value: string) => void
  onDepartmentChange: (value: string) => void
  onEnrollmentYearChange: (value: string) => void
}

export function EditProfileForm({
  displayName,
  department,
  enrollmentYear,
  onDisplayNameChange,
  onDepartmentChange,
  onEnrollmentYearChange,
}: EditProfileFormProps) {
  const [saving, setSaving] = useState(false)
  const queryClient = useQueryClient()

  const { data: depts } = useDepartmentsControllerFindAll({
    query: { select: (r) => r.data },
  })

  const { mutateAsync: updateMe } = useUsersControllerUpdateMe()
  const { mutateAsync: updateAcademic } = useUsersControllerUpdateAcademicProfile()

  async function handleSave() {
    setSaving(true)
    try {
      await Promise.all([
        updateMe({
          data: {
            name: displayName,
            enrollmentYear: enrollmentYear ? Number(enrollmentYear) : undefined,
          },
        }),
        updateAcademic({ data: { departmentId: department || null } }),
      ])
      await queryClient.invalidateQueries({ queryKey: getUsersControllerGetMeQueryKey() })
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
          <input
            type="text"
            value={displayName}
            onChange={(e) => onDisplayNameChange(e.target.value)}
            className="w-full h-[42px] px-3 bg-card border border-border rounded-[6px] text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber"
          />
        </div>
        <div>
          <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
            Department
          </label>
          <select
            value={department}
            onChange={(e) => onDepartmentChange(e.target.value)}
            className="w-full h-[42px] px-3 bg-card border border-border rounded-[6px] text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber"
          >
            <option value="">None</option>
            {(depts ?? []).map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
            Enrollment Year
          </label>
          <input
            type="number"
            value={enrollmentYear}
            onChange={(e) => onEnrollmentYearChange(e.target.value)}
            className="w-full h-[42px] px-3 bg-card border border-border rounded-[6px] text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber"
          />
          <p className="text-xs text-text-muted mt-1.5">Used to calculate your year level</p>
        </div>
        <div className="flex justify-end">
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
