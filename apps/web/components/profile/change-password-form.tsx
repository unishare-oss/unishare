'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authClient } from '@/src/lib/auth/client'

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)
    if (newPassword !== confirm) {
      setError('Passwords do not match')
      return
    }
    setSaving(true)
    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    })
    setSaving(false)
    if (error) {
      setError(error.message ?? 'Failed to change password')
    } else {
      setSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirm('')
    }
  }

  return (
    <div className="border border-border rounded-[6px] p-6 bg-card mb-8">
      <div className="border-b border-border pb-3 mb-5">
        <h3 className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
          Change Password
        </h3>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
            Current Password
          </label>
          <Input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
            New Password
          </label>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>
        <div>
          <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
            Confirm New Password
          </label>
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>
        <div className="flex items-center justify-end gap-3">
          {error && <p className="text-xs text-destructive">{error}</p>}
          {success && <p className="text-xs text-green-500">Password changed successfully</p>}
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Change Password'}
          </Button>
        </div>
      </form>
    </div>
  )
}
