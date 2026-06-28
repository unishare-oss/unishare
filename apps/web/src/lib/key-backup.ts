/**
 * Server-side encrypted key backup. The server only ever stores the
 * passphrase-encrypted transfer payload (PBKDF2 + AES-GCM) — it cannot
 * decrypt it. Restoring requires the user's transfer passphrase.
 */

export async function uploadKeyBackup(keyBackup: string): Promise<void> {
  const res = await fetch('/api/users/me/key-backup', {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyBackup }),
  })
  if (!res.ok) throw new Error(`Failed to store key backup: ${res.status}`)
}

export async function fetchKeyBackup(): Promise<string | null> {
  const res = await fetch('/api/users/me/key-backup', { credentials: 'include' })
  if (!res.ok) throw new Error(`Failed to fetch key backup: ${res.status}`)
  const body = (await res.json()) as { data?: { keyBackup?: string | null } }
  return body.data?.keyBackup ?? null
}
