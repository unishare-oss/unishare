'use client'

import { useRef, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { QRCodeSVG } from 'qrcode.react'
import { AlertTriangle, Loader2, ScanLine, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getPrivateKey, storePrivateKey } from '@/src/lib/indexeddb'
import {
  MIN_KEY_TRANSFER_PASSPHRASE_LENGTH,
  decryptPrivateKeyTransferPayload,
  encryptPrivateKeyTransferPayload,
  exportPrivateKeyAsJwk,
  importPrivateKeyFromJwk,
  normalizeKeyTransferPassphrase,
  privateKeyMatchesPublicKey,
} from '@/src/lib/crypto'
import { fetchKeyBackup, uploadKeyBackup } from '@/src/lib/key-backup'

// --- Export dialog (show QR on old device) ---

interface ExportKeysDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExportKeysDialog({ open, onOpenChange }: ExportKeysDialogProps) {
  const { session } = useAuth()
  const userId = session?.user?.id
  const [payload, setPayload] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [passphrase, setPassphrase] = useState('')
  const [confirmPassphrase, setConfirmPassphrase] = useState('')
  const [backupStatus, setBackupStatus] = useState<'saving' | 'saved' | 'failed' | null>(null)

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setPayload(null)
      setConfirmed(false)
      setError(null)
      setPassphrase('')
      setConfirmPassphrase('')
      setBackupStatus(null)
    }
    onOpenChange(next)
  }

  const handleConfirm = async () => {
    try {
      const normalizedPassphrase = normalizeKeyTransferPassphrase(passphrase)
      const normalizedConfirmPassphrase = normalizeKeyTransferPassphrase(confirmPassphrase)
      if (normalizedPassphrase.length < MIN_KEY_TRANSFER_PASSPHRASE_LENGTH) {
        throw new Error(
          `Use a passphrase with at least ${MIN_KEY_TRANSFER_PASSPHRASE_LENGTH} characters.`,
        )
      }
      if (normalizedPassphrase !== normalizedConfirmPassphrase) {
        throw new Error('Passphrases do not match.')
      }
      if (!userId) throw new Error('User not authenticated.')
      const key = await getPrivateKey(userId)
      if (!key) throw new Error('No private key found on this device.')
      const exported = await exportPrivateKeyAsJwk(key)
      const encryptedPayload = await encryptPrivateKeyTransferPayload(
        exported,
        normalizedPassphrase,
      )
      setPayload(encryptedPayload)
      setConfirmed(true)

      // Best-effort encrypted backup: the server only stores the
      // passphrase-encrypted blob, so other devices can restore without QR.
      setBackupStatus('saving')
      try {
        await uploadKeyBackup(encryptedPayload)
        setBackupStatus('saved')
      } catch {
        setBackupStatus('failed')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to export key.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Export encryption keys</DialogTitle>
          <DialogDescription>
            Scan this QR code from your new device, then enter the same passphrase there to decrypt
            the key transfer.
          </DialogDescription>
        </DialogHeader>

        {!confirmed ? (
          <>
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertDescription>
                Anyone who scans this QR code gains full access to your encrypted messages. Only
                show it in private.
              </AlertDescription>
            </Alert>
            <div className="space-y-3">
              <Input
                type="password"
                value={passphrase}
                placeholder="Set transfer passphrase"
                onChange={(e) => setPassphrase(e.target.value)}
              />
              <Input
                type="password"
                value={confirmPassphrase}
                placeholder="Confirm transfer passphrase"
                onChange={(e) => setConfirmPassphrase(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirm}>
                I understand, show QR
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="rounded-xl border p-4 bg-white">
              <QRCodeSVG value={payload!} size={220} level="L" />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Scan from the new device and enter your transfer passphrase to import — or just pick
              “Restore from backup” there and enter the passphrase.
            </p>
            {backupStatus === 'saving' && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="size-3 animate-spin" />
                Saving encrypted backup to your account…
              </p>
            )}
            {backupStatus === 'saved' && (
              <p className="text-xs text-green-600 flex items-center gap-1.5">
                <ShieldCheck className="size-3" />
                Encrypted backup saved — other devices can restore with this passphrase.
              </p>
            )}
            {backupStatus === 'failed' && (
              <p className="text-xs text-destructive">
                Could not save the encrypted backup to the server. QR transfer still works.
              </p>
            )}
            <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// --- Import dialog (scan QR on new device) ---

interface ImportKeysDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The user's public key JWK string from the server, used to validate the scanned key. */
  userPublicKey: string
}

export function ImportKeysDialog({ open, onOpenChange, userPublicKey }: ImportKeysDialogProps) {
  const { session } = useAuth()
  const userId = session?.user?.id
  const [status, setStatus] = useState<'idle' | 'restoring' | 'scanning' | 'success' | 'error'>(
    'idle',
  )
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [passphrase, setPassphrase] = useState('')
  const scannerRef = useRef<import('html5-qrcode').Html5Qrcode | null>(null)
  const divId = 'qr-scanner-container'

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
      } catch {}
      scannerRef.current = null
    }
  }

  /** Decrypts a transfer payload, validates it against the account, and stores it. */
  const importPayload = async (payloadString: string, transferPassphrase: string) => {
    const privateKeyJwk = await decryptPrivateKeyTransferPayload(payloadString, transferPassphrase)
    if (!privateKeyMatchesPublicKey(privateKeyJwk, userPublicKey)) {
      throw new Error("Key transfer decrypted, but this key pair doesn't match your account.")
    }
    if (!userId) throw new Error('User not authenticated.')
    const key = await importPrivateKeyFromJwk(privateKeyJwk)
    await storePrivateKey(key, userId)
  }

  const validatedPassphrase = (): string | null => {
    const normalized = normalizeKeyTransferPassphrase(passphrase)
    if (normalized.length < MIN_KEY_TRANSFER_PASSPHRASE_LENGTH) {
      setErrorMsg(
        `Enter a transfer passphrase with at least ${MIN_KEY_TRANSFER_PASSPHRASE_LENGTH} characters.`,
      )
      setStatus('error')
      return null
    }
    return normalized
  }

  const restoreFromBackup = async () => {
    const restorePassphrase = validatedPassphrase()
    if (!restorePassphrase) return
    setStatus('restoring')
    setErrorMsg(null)
    try {
      const backup = await fetchKeyBackup()
      if (!backup) {
        throw new Error(
          'No encrypted backup found for your account. Use the QR transfer from your other device instead — it also saves a backup for next time.',
        )
      }
      await importPayload(backup, restorePassphrase)
      setStatus('success')
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Failed to restore from backup.')
      setStatus('error')
    }
  }

  const startScanner = async () => {
    const scanPassphrase = validatedPassphrase()
    if (!scanPassphrase) return
    setStatus('scanning')
    setErrorMsg(null)
    const { Html5Qrcode } = await import('html5-qrcode')
    const scanner = new Html5Qrcode(divId)
    scannerRef.current = scanner

    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decodedText) => {
          await stopScanner()
          try {
            await importPayload(decodedText, scanPassphrase)
            setStatus('success')
          } catch (e) {
            setErrorMsg(e instanceof Error ? e.message : 'Invalid QR code.')
            setStatus('error')
          }
        },
        undefined,
      )
    } catch {
      setErrorMsg('Could not access camera. Please allow camera permissions.')
      setStatus('error')
    }
  }

  const handleSuccess = () => {
    onOpenChange(false)
    window.location.reload()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          stopScanner()
          setStatus('idle')
          setErrorMsg(null)
          setPassphrase('')
        }
        onOpenChange(v)
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Import encryption keys</DialogTitle>
          <DialogDescription>
            Restore your keys with the transfer passphrase, or scan the QR code shown on your other
            device.
          </DialogDescription>
        </DialogHeader>

        {status === 'idle' && (
          <>
            <p className="text-sm text-muted-foreground">
              If you exported your keys before, enter your transfer passphrase to restore the
              encrypted backup. Otherwise, open the chat info panel on your other device, go to
              Settings, and choose <strong>Export encryption keys</strong>.
            </p>
            <Input
              type="password"
              value={passphrase}
              placeholder="Enter transfer passphrase"
              onChange={(e) => setPassphrase(e.target.value)}
            />
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={startScanner}
                disabled={
                  normalizeKeyTransferPassphrase(passphrase).length <
                  MIN_KEY_TRANSFER_PASSPHRASE_LENGTH
                }
              >
                <ScanLine className="size-4 mr-2" />
                Scan QR
              </Button>
              <Button
                onClick={restoreFromBackup}
                disabled={
                  normalizeKeyTransferPassphrase(passphrase).length <
                  MIN_KEY_TRANSFER_PASSPHRASE_LENGTH
                }
              >
                <ShieldCheck className="size-4 mr-2" />
                Restore from backup
              </Button>
            </DialogFooter>
          </>
        )}

        {status === 'restoring' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Decrypting your key backup…</p>
          </div>
        )}

        {status === 'scanning' && (
          <div className="flex flex-col items-center gap-3">
            <div id={divId} className="w-full rounded-xl overflow-hidden" />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                stopScanner()
                setStatus('idle')
              }}
            >
              Cancel
            </Button>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <ShieldCheck className="size-12 text-green-500" />
            <p className="text-sm">
              Keys imported successfully. The page will reload to apply them.
            </p>
            <Button className="w-full" onClick={handleSuccess}>
              Reload now
            </Button>
          </div>
        )}

        {status === 'error' && (
          <>
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  setErrorMsg(null)
                  setStatus('idle')
                }}
              >
                Try again
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
