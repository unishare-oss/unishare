'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { authClient } from '@/src/lib/auth/client'
import { useUsersControllerClearMyKeys } from '@/src/lib/api/generated/users/users'
import { clearPrivateKey } from '@/src/lib/indexeddb'
import { useAuth } from '@/contexts/auth-context'

export function DangerZoneCard() {
  const router = useRouter()
  const { session } = useAuth()
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [removeKeysOpen, setRemoveKeysOpen] = useState(false)
  const [removeKeysError, setRemoveKeysError] = useState('')

  const { mutate: clearMyKeys, isPending: removingKeys } = useUsersControllerClearMyKeys({
    mutation: {
      onSuccess: async () => {
        const userId = session?.user?.id
        if (userId) await clearPrivateKey(userId)
        setRemoveKeysOpen(false)
        window.location.reload()
      },
      onError: () => setRemoveKeysError('Failed to remove encryption keys. Please try again.'),
    },
  })

  async function handleDownload() {
    setDownloading(true)
    try {
      const res = await fetch(`/api/users/me/export`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Export failed')
      const json = await res.json()
      const payload = json.data ?? json
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `unishare-my-data-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // silently ignore — browser will show nothing downloaded
    } finally {
      setDownloading(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    setDeleteError('')
    const { error } = await authClient.deleteUser({ callbackURL: '/login' })

    if (error) {
      setDeleteError(error.message ?? 'Failed to delete account')
      setDeleting(false)
      // Keep dialog open to show error
    } else {
      setDialogOpen(false)
      router.replace('/login')
    }
  }

  return (
    <div className="border border-destructive/40 rounded-[6px] p-6 bg-card mb-8">
      <div className="border-b border-border pb-3 mb-5">
        <h3 className="font-mono text-[11px] uppercase tracking-wider text-destructive">
          Danger Zone
        </h3>
      </div>

      {/* Download my data */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-sm font-medium text-foreground">Download my data</p>
          <p className="text-xs text-text-muted mt-0.5">
            Export a copy of your personal data (PDPA right to data portability).
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading}>
          {downloading ? 'Preparing...' : 'Download'}
        </Button>
      </div>

      {/* Remove encryption keys */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-sm font-medium text-foreground">Remove encryption keys</p>
          <p className="text-xs text-text-muted mt-0.5">
            Wipe your encryption keys from this device and the server.
          </p>
        </div>
        <AlertDialog
          open={removeKeysOpen}
          onOpenChange={(v) => {
            setRemoveKeysOpen(v)
            if (!v) setRemoveKeysError('')
          }}
        >
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              Remove keys
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove encryption keys?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    This will permanently remove your encryption keys. Before you continue,
                    understand what this means:
                  </p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>
                      All encrypted chat messages will become{' '}
                      <strong className="text-foreground">permanently unreadable</strong>
                    </li>
                    <li>Your private key will be wiped from this device</li>
                    <li>New keys will be generated automatically on your next sign-in</li>
                    <li>
                      Old messages <strong className="text-foreground">cannot be recovered</strong>
                    </li>
                  </ul>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            {removeKeysError && <p className="text-xs text-destructive px-1">{removeKeysError}</p>}
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault()
                  clearMyKeys()
                }}
                disabled={removingKeys}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {removingKeys ? 'Removing...' : 'Remove keys'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Delete account */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Delete account</p>
          <p className="text-xs text-text-muted mt-0.5">
            Permanently delete your account and all associated data.
          </p>
        </div>
        <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. Your account and all your data will be permanently
                deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {deleteError && <p className="text-xs text-destructive px-1">{deleteError}</p>}
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault()
                  handleDelete()
                }}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? 'Deleting...' : 'Delete Account'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
