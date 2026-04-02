'use client'

import { useState } from 'react'
import { Copy, Check, AlertCircle } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useReadingListsControllerUpdate } from '@/src/lib/api/generated/reading-lists/reading-lists'
import type { ReadingListEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

interface ShareDialogProps {
  list: ReadingListEntity
  open: boolean
  onOpenChange: (open: boolean) => void
  isOwner: boolean
  onPublicityChange?: () => void
}

export function ShareDialog({
  list,
  open,
  onOpenChange,
  isOwner,
  onPublicityChange,
}: ShareDialogProps) {
  const [copied, setCopied] = useState(false)
  const [showPrivateWarning, setShowPrivateWarning] = useState(false)
  const [tempIsPublic, setTempIsPublic] = useState(list.isPublic)

  const { mutate: updateList, isPending: isUpdating } = useReadingListsControllerUpdate({
    mutation: {
      onSuccess: () => {
        toast.success(tempIsPublic ? 'List is now public' : 'List is now private')
        setShowPrivateWarning(false)
        onPublicityChange?.()
      },
      onError: () => {
        toast.error('Failed to update list visibility')
        setTempIsPublic(!tempIsPublic)
      },
    },
  })

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/lists/${list.id}`

  function handleCopyLink() {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    toast.success('Link copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  function handlePublicityToggle(newIsPublic: boolean) {
    setTempIsPublic(newIsPublic)
    // Show warning if making private (losing shared link functionality)
    if (list.isPublic && !newIsPublic) {
      setShowPrivateWarning(true)
    } else {
      updateList({
        id: list.id,
        data: {
          name: list.name,
          description: list.description ?? undefined,
          isPublic: newIsPublic,
        },
      })
    }
  }

  function confirmMakePrivate() {
    updateList({
      id: list.id,
      data: {
        name: list.name,
        description: list.description ?? undefined,
        isPublic: false,
      },
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share &ldquo;{list.name}&rdquo;</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 pt-2">
            {/* Public/Private Toggle (only for owner) */}
            {isOwner && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Switch
                    id="share-public"
                    checked={tempIsPublic}
                    onCheckedChange={handlePublicityToggle}
                    disabled={isUpdating}
                  />
                  <Label htmlFor="share-public" className="cursor-pointer">
                    {tempIsPublic ? 'Public' : 'Private'}
                  </Label>
                </div>
                <p className="text-sm text-text-muted">
                  {tempIsPublic
                    ? 'Anyone with the link can view this list'
                    : 'Only you can access this list'}
                </p>
              </div>
            )}

            {/* Share Link Section (only show if public or owner) */}
            {(tempIsPublic || isOwner) && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Shareable link</Label>
                  <div className="flex gap-2 items-center">
                    <div className="flex-1 bg-muted rounded px-3 py-2 font-mono text-xs break-all">
                      {shareUrl}
                    </div>
                    <Button
                      size="icon-sm"
                      variant="outline"
                      onClick={handleCopyLink}
                      aria-label="Copy link"
                      disabled={!tempIsPublic && !isOwner}
                    >
                      {copied ? (
                        <Check className="size-3.5" strokeWidth={2} />
                      ) : (
                        <Copy className="size-3.5" strokeWidth={1.5} />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* QR Code (only show if public or owner) */}
            {(tempIsPublic || isOwner) && (
              <div className="space-y-3">
                <Label className="text-xs font-medium">QR code</Label>
                <div className="flex justify-center bg-muted rounded p-4">
                  <QRCodeCanvas
                    value={shareUrl}
                    size={160}
                    level="H"
                    fgColor="#000000"
                    bgColor="#ffffff"
                  />
                </div>
              </div>
            )}

            {/* Private state message (only if not public) */}
            {!tempIsPublic && !isOwner && (
              <div className="flex gap-2 items-start bg-muted rounded p-3">
                <AlertCircle className="size-4 shrink-0 text-text-muted mt-0.5" strokeWidth={1.5} />
                <p className="text-xs text-text-muted">
                  This list is private. Only the owner can change the visibility settings.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Warning dialog for making private */}
      <AlertDialog open={showPrivateWarning} onOpenChange={setShowPrivateWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Make this list private?</AlertDialogTitle>
            <AlertDialogDescription>
              If you make this list private, anyone who has the link won&apos;t be able to access it
              anymore. This change is reversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTempIsPublic(true)}>Keep public</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmMakePrivate}
              disabled={isUpdating}
            >
              {isUpdating ? 'Making private...' : 'Make private'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
