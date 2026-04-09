'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { X, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ChatImageLightboxProps {
  src: string
  caption?: string | null
  open: boolean
  onClose: () => void
}

export function ChatImageLightbox({ src, caption, open, onClose }: ChatImageLightboxProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm',
        'animate-in fade-in duration-150',
      )}
      onClick={onClose}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="icon"
          className="text-white/70 hover:text-white hover:bg-white/10 rounded-full"
          onClick={onClose}
        >
          <X className="size-5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-white/70 hover:text-white hover:bg-white/10 gap-1.5"
          onClick={() => window.open(src, '_blank')}
        >
          <ExternalLink className="size-3.5" />
          Open original
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center p-2 min-h-0">
        <div onClick={(e) => e.stopPropagation()}>
          <Image
            src={src}
            alt={caption || 'Image'}
            width={0}
            height={0}
            sizes="100vw"
            className="max-h-[92vh] max-w-[98vw] w-auto h-auto rounded-lg select-none"
            draggable={false}
            priority
          />
        </div>
      </div>

      {/* Caption */}
      {caption && (
        <div
          className="shrink-0 px-6 py-3 text-center text-sm text-white/70"
          onClick={(e) => e.stopPropagation()}
        >
          {caption}
        </div>
      )}
    </div>,
    document.body,
  )
}
