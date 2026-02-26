'use client'

import { departments } from '@/lib/mock-data'

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
            {departments.map((dept) => (
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
        <div>
          <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
            Profile Image URL <span className="normal-case text-text-muted">(optional)</span>
          </label>
          <input
            type="url"
            placeholder="https://..."
            className="w-full h-[42px] px-3 bg-card border border-border rounded-[6px] text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-amber"
          />
        </div>
        <div className="flex justify-end">
          <button className="h-9 px-5 bg-amber text-primary-foreground text-sm font-medium rounded-[6px] hover:bg-amber-hover transition-colors duration-150">
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
