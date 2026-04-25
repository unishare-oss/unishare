'use client'

import Image from 'next/image'
import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import type { LinkPreviewResponseDto } from '@/src/lib/api/generated/unishareAPI.schemas'

interface LinkPreviewProps {
  url: string
  preview: LinkPreviewResponseDto | null
  isLoading: boolean
  isMe?: boolean
}

export function LinkPreview({ url, preview, isLoading, isMe }: LinkPreviewProps) {
  const [copied, setCopied] = useState(false)

  function copyLink(e: React.MouseEvent) {
    e.stopPropagation()
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isLoading) {
    return (
      <div className="mt-1.5 rounded-lg border border-border bg-background overflow-hidden animate-pulse">
        <div className="aspect-square w-full bg-muted" />
        <div className="p-2 space-y-1.5">
          <div className="h-2 w-1/3 rounded bg-muted" />
          <div className="h-2.5 w-3/4 rounded bg-muted" />
        </div>
      </div>
    )
  }

  if (!preview?.title) return null

  const image = preview.images?.[0] ?? preview.image ?? null

  return (
    <div className="group mt-1.5 inline-block w-85">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block rounded-lg border border-border bg-background overflow-hidden transition-opacity hover:opacity-80"
      >
        {image && (
          <div className="relative aspect-[1640/856] w-full overflow-hidden">
            <Image src={image} alt={preview.title} fill className="object-cover" unoptimized />
          </div>
        )}

        <div className="px-2.5 py-2">
          {preview.siteName && (
            <p className="text-[0.5rem] uppercase tracking-widest font-semibold mb-0.5 text-muted-foreground truncate">
              {preview.siteName}
            </p>
          )}
          <p className="text-sm font-semibold leading-snug line-clamp-1 text-foreground">
            {preview.title}
          </p>
          {preview.description && (
            <p className="text-[0.6875rem] mt-0.5 line-clamp-2 leading-relaxed text-muted-foreground">
              {preview.description}
            </p>
          )}
        </div>
      </a>
      <div className="flex items-center gap-1.5 px-0.5 pt-1">
        {isMe && (
          <button
            onClick={copyLink}
            className="shrink-0 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            title="Copy link"
          >
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          </button>
        )}
        <p className="flex-1 text-[0.6rem] truncate text-muted-foreground/60">{url}</p>
        {!isMe && (
          <button
            onClick={copyLink}
            className="shrink-0 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            title="Copy link"
          >
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          </button>
        )}
      </div>
    </div>
  )
}
