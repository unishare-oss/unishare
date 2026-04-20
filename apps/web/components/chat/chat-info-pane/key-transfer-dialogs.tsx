'use client'

import { useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { AlertTriangle, Loader2, ScanLine, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  exportPrivateKeyAsJwk,
  importPrivateKeyFromJwk,
  privateKeyMatchesPublicKey,
} from '@/src/lib/crypto'

// --- Export dialog (show QR on old device) ---

interface ExportKeysDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExportKeysDialog({ open, onOpenChange }: ExportKeysDialogProps) {
  const [jwk, setJwk] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setJwk(null)
      setConfirmed(false)
      setError(null)
    }
  }, [open])

  const handleConfirm = async () => {
    try {
      const key = await getPrivateKey()
      if (!key) throw new Error('No private key found on this device.')
      const exported = await exportPrivateKeyAsJwk(key)
      setJwk(exported)
      setConfirmed(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to export key.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Export encryption keys</DialogTitle>
          <DialogDescription>
            Scan this QR code from your new device to transfer your private key.
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
              <QRCodeSVG value={jwk!} size={220} level="L" />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Scan from the new device, then close this dialog.
            </p>
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
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
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

  const startScanner = async () => {
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
            if (!privateKeyMatchesPublicKey(decodedText, userPublicKey)) {
              throw new Error("This QR does not match your account's encryption keys.")
            }
            const key = await importPrivateKeyFromJwk(decodedText)
            await storePrivateKey(key)
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

  useEffect(() => {
    if (!open) {
      stopScanner()
      setStatus('idle')
      setErrorMsg(null)
    }
  }, [open])

  const handleSuccess = () => {
    onOpenChange(false)
    window.location.reload()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) stopScanner()
        onOpenChange(v)
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Import encryption keys</DialogTitle>
          <DialogDescription>
            Point your camera at the QR code shown on your other device.
          </DialogDescription>
        </DialogHeader>

        {status === 'idle' && (
          <>
            <p className="text-sm text-muted-foreground">
              Open the chat info panel on your other device, go to Settings, and choose{' '}
              <strong>Export encryption keys</strong>.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={startScanner}>
                <ScanLine className="size-4 mr-2" />
                Start scanning
              </Button>
            </DialogFooter>
          </>
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
              <Button onClick={startScanner}>
                <Loader2 className="size-4 mr-2" />
                Try again
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
