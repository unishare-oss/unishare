'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ClipboardCopy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function CanvasHeader() {
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied')
    } catch {
      toast.error('Could not copy link — copy it from the address bar')
    }
  }

  return (
    <header className="relative z-10 flex h-12 items-center justify-between border-b border-border bg-card px-4">
      <Link
        href="/feed"
        aria-label="Back to UniShare feed"
        className="flex items-center gap-2 text-sm font-semibold text-foreground"
      >
        <Image
          src="/icon.svg"
          alt="UniShare logo"
          width={24}
          height={24}
          className="rounded-[4px]"
        />
        <span className="font-mono text-[14px] font-bold tracking-tight">Unishare</span>
      </Link>

      <Button variant="default" size="sm" onClick={handleCopyLink} className="gap-1">
        <ClipboardCopy className="h-4 w-4" />
        Copy link
      </Button>
    </header>
  )
}
