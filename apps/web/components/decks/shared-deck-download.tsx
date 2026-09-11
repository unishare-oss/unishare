'use client'

import { useState } from 'react'
import { FileDown, Loader2, Presentation } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

/**
 * Download buttons on a shared deck page.
 *
 * The API hands back a short-lived presigned URL rather than the bytes, so this fetches the
 * URL and then navigates to it. Only the formats the API reported are offered — a failed
 * preview render leaves no PDF, and a button that 404s is worse than no button.
 *
 * Deliberately not using the generated hook: this page is unauthenticated, and the generated
 * fetcher exists to carry a session.
 */
export function SharedDeckDownload({ token, formats }: { token: string; formats: string[] }) {
  const [pending, setPending] = useState<string | null>(null)

  async function download(format: string) {
    setPending(format)
    try {
      const res = await fetch(`/api/decks/shared/${token}/download?format=${format}`, {
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(String(res.status))
      const { data } = (await res.json()) as { data: { url: string } }
      window.location.href = data.url
    } catch {
      // Covers a link revoked between page load and click, which is the interesting case.
      toast.error('This download is no longer available')
    } finally {
      setPending(null)
    }
  }

  if (formats.length === 0) {
    return <p className="text-sm text-text-muted">No files are available for this deck.</p>
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {formats.includes('pptx') && (
        <Button size="sm" disabled={pending !== null} onClick={() => download('pptx')}>
          {pending === 'pptx' ? (
            <Loader2
              className="size-4 mr-1.5 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : (
            <Presentation className="size-4 mr-1.5" strokeWidth={1.5} aria-hidden="true" />
          )}
          PowerPoint
        </Button>
      )}
      {formats.includes('pdf') && (
        <Button
          variant="outline"
          size="sm"
          disabled={pending !== null}
          onClick={() => download('pdf')}
        >
          {pending === 'pdf' ? (
            <Loader2
              className="size-4 mr-1.5 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : (
            <FileDown className="size-4 mr-1.5" strokeWidth={1.5} aria-hidden="true" />
          )}
          PDF
        </Button>
      )}
    </div>
  )
}
