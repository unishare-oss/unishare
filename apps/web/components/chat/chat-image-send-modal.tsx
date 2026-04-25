'use client'

import { useEffect, useRef, useState } from 'react'
import { ImageIcon, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import type { ChatMessageEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

interface ChatImageSendModalProps {
  file: File | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSend: (file: File, caption: string) => Promise<void>
  replyingTo?: ChatMessageEntity | null
}

export function ChatImageSendModal({
  file,
  open,
  onOpenChange,
  onSend,
  replyingTo,
}: ChatImageSendModalProps) {
  const [caption, setCaption] = useState('')
  const [uploading, setUploading] = useState(false)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const captionRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCaption('')
      setTimeout(() => captionRef.current?.focus(), 100)
    }
  }, [open])

  const handleSend = async () => {
    if (!file || uploading) return
    setUploading(true)
    try {
      await onSend(file, caption.trim())
    } finally {
      setUploading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    if (e.key === 'Escape') onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={uploading ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0">
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <ImageIcon className="size-4 text-primary" />
            Send Photo
          </DialogTitle>
        </DialogHeader>

        {/* Image preview */}
        <div className="px-4 pt-3">
          {objectUrl && (
            <div className="relative rounded-xl overflow-hidden bg-muted border border-border max-h-72 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- blob URL, cannot be optimized by next/image */}
              <img src={objectUrl} alt="Preview" className="max-h-72 max-w-full object-contain" />
              {uploading && (
                <div className="absolute inset-0 bg-background/60 flex items-center justify-center backdrop-blur-sm">
                  <Loader2 className="size-8 animate-spin text-primary" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reply context */}
        {replyingTo && (
          <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-accent/60 border border-accent-foreground/10 text-xs text-muted-foreground">
            <span className="font-semibold text-accent-foreground">
              Replying to {replyingTo.user?.name ?? 'Deleted User'}
            </span>
            <p className="truncate mt-0.5 italic opacity-70">
              {replyingTo.content ?? (replyingTo.imageUrl ? '📷 Photo' : 'Message deleted')}
            </p>
          </div>
        )}

        {/* Caption input */}
        <div className="px-4 pt-3">
          <Textarea
            ref={captionRef}
            placeholder="Add a caption… (optional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={uploading}
            rows={2}
            className="resize-none text-sm"
          />
        </div>

        <DialogFooter className="px-4 py-3 gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={uploading}
          >
            <X className="size-3.5 mr-1.5" />
            Cancel
          </Button>
          <Button size="sm" onClick={handleSend} disabled={!file || uploading}>
            {uploading ? (
              <>
                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <ImageIcon className="size-3.5 mr-1.5" />
                Send Photo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
