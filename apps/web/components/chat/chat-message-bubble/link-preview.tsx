'use client'

import Image from 'next/image'
import { DeliveryTick } from './delivery-tick'
import type { DeliveryStatus } from '@/hooks/use-chat-mutations'

interface LinkPreviewProps {
  url: string
  preview: any
  isLoading: boolean
  isMe?: boolean
  deliveryStatus?: DeliveryStatus
}

export function LinkPreview({ url, preview, isLoading, isMe, deliveryStatus }: LinkPreviewProps) {
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
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1.5 inline-block w-85 rounded-lg border border-border bg-background overflow-hidden transition-opacity hover:opacity-80"
    >
      {image && (
        <div className="relative aspect-square w-full overflow-hidden">
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
        {isMe && deliveryStatus && (
          <div className="flex justify-end mt-1">
            <DeliveryTick status={deliveryStatus} />
          </div>
        )}
      </div>
    </a>
  )
}
