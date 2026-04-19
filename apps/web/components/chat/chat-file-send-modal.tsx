'use client'

import { useEffect, useRef, useState } from 'react'
import { FileIcon, Loader2, X } from 'lucide-react'
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

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface ChatFileSendModalProps {
  file: File | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSend: (file: File, caption: string) => Promise<void>
  replyingTo?: ChatMessageEntity | null
}

export function ChatFileSendModal({
  file,
  open,
  onOpenChange,
  onSend,
  replyingTo,
}: ChatFileSendModalProps) {
  const [caption, setCaption] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const captionRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCaption('')
      setError(null)
      if (file && file.size > MAX_FILE_SIZE) {
        setError(`File is too large. Maximum size is ${formatBytes(MAX_FILE_SIZE)}.`)
      }
      setTimeout(() => captionRef.current?.focus(), 100)
    }
  }, [open, file])

  const handleSend = async () => {
    if (!file || uploading || file.size > MAX_FILE_SIZE) return
    setUploading(true)
    try {
      await onSend(file, caption.trim())
      onOpenChange(false)
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  if (!file) return null

  const tooLarge = file.size > MAX_FILE_SIZE

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md gap-4">
        <DialogHeader>
          <DialogTitle className="text-base">Send File</DialogTitle>
        </DialogHeader>

        {/* Reply context */}
        {replyingTo && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/50 text-xs text-muted-foreground">
            <div className="w-0.5 h-6 bg-primary rounded-full shrink-0" />
            <span className="truncate">
              Replying to{' '}
              <span className="font-medium text-foreground">{replyingTo.user?.name}</span>
            </span>
          </div>
        )}

        {/* File preview */}
        <div
          className={`flex items-center gap-3 p-4 rounded-xl border ${tooLarge ? 'border-destructive/50 bg-destructive/5' : 'border-border bg-muted/30'}`}
        >
          <div
            className={`flex items-center justify-center w-12 h-12 rounded-lg shrink-0 ${tooLarge ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}
          >
            <FileIcon className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p
              className={`text-xs mt-0.5 ${tooLarge ? 'text-destructive' : 'text-muted-foreground'}`}
            >
              {formatBytes(file.size)}
              {tooLarge ? ' — too large' : ''}
            </p>
          </div>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        {/* Caption */}
        <Textarea
          ref={captionRef}
          placeholder="Add a message… (optional)"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !tooLarge) {
              e.preventDefault()
              handleSend()
            }
          }}
          className="resize-none text-sm min-h-[72px]"
          disabled={uploading}
        />

        {/* Upload progress overlay */}
        {uploading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Uploading…
          </div>
        )}

        <DialogFooter className="gap-2">
          <p className="text-[0.65rem] text-muted-foreground mr-auto self-center">
            Files are deleted after 7 days
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={uploading}
          >
            <X className="size-3.5 mr-1.5" />
            Cancel
          </Button>
          <Button size="sm" onClick={handleSend} disabled={uploading || tooLarge}>
            {uploading ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
