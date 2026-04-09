'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { ArrowLeft, X } from 'lucide-react'

export function DetailPane({
  title,
  onBack,
  onClose,
  children,
}: {
  title: string
  onBack: () => void
  onClose?: () => void
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-3 border-b shrink-0">
        <Button variant="ghost" size="icon-xs" onClick={onBack} className="shrink-0">
          <ArrowLeft className="size-4" />
        </Button>
        <span className="text-sm font-semibold flex-1">{title}</span>
        {onClose && (
          <Button variant="ghost" size="icon-xs" className="md:hidden" onClick={onClose}>
            <X className="size-4" />
          </Button>
        )}
      </div>
      <ScrollArea className="flex-1 min-h-0 [&>[data-radix-scroll-area-viewport]>div]:block!">
        {children}
      </ScrollArea>
    </div>
  )
}
