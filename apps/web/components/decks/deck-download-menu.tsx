'use client'

import { useState } from 'react'
import { ChevronDown, Download, FileDown, Loader2, Presentation } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  decksControllerGetDeck,
  decksControllerGetDownloadUrl,
  decksControllerReexport,
  getDecksControllerGetDeckQueryKey,
  getDecksControllerListDecksQueryKey,
} from '@/src/lib/api/generated/decks/decks'
import type { DeckEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

/**
 * The only way to download a deck.
 *
 * It re-renders before handing the file over, which is the whole point: slides are edited in
 * the generator's own editor, so the copy in our object storage is a snapshot from the last
 * render. The button that used to serve that snapshot directly could hand a student their
 * pre-edit deck, and the separate "save" action that existed to prevent it was a workaround for
 * a button that could lie.
 *
 * A render costs no model tokens — it runs on its own queue so it never waits behind a
 * generation — so paying it on every download is cheaper than any way of guessing whether it
 * is needed. We cannot detect edits anyway: the editor is cross-origin.
 */

/** Renders take seconds; this is the "something is wrong" ceiling, not an expected wait. */
const RENDER_TIMEOUT_MS = 120_000
const POLL_MS = 1500

type Format = 'pptx' | 'pdf'

export function DeckDownloadMenu({
  deck,
  variant = 'default',
  size = 'sm',
}: {
  deck: DeckEntity
  variant?: 'default' | 'outline'
  size?: 'sm' | 'default'
}) {
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)

  async function download(format: Format) {
    setBusy(true)
    try {
      const before = deck.completedAt ?? ''
      await decksControllerReexport(deck.id)

      const ready = await waitForRender(deck.id, before)
      if (!ready) throw new Error('render did not finish')

      const res = await decksControllerGetDownloadUrl(deck.id, { format })

      // location.href, not window.open: by now the click is seconds old, so a popup would be
      // blocked as non-gesture. The presigned URL carries Content-Disposition: attachment, so
      // this downloads the file without navigating away from the page.
      window.location.href = res.data.url

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getDecksControllerGetDeckQueryKey(deck.id) }),
        queryClient.invalidateQueries({ queryKey: getDecksControllerListDecksQueryKey() }),
      ])
    } catch {
      toast.error('Could not prepare the download. Your deck and its slides are unaffected.')
    } finally {
      setBusy(false)
    }
  }

  const hadPdf = deck.hasPdf

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={busy} aria-label="Download this deck">
          {busy ? (
            <Loader2 className="size-4 mr-1.5 animate-spin" strokeWidth={1.5} />
          ) : (
            <Download className="size-4 mr-1.5" strokeWidth={1.5} aria-hidden="true" />
          )}
          {/* Honest about a wait the student did not have before. */}
          {busy ? 'Preparing...' : 'Download'}
          {!busy && (
            <ChevronDown
              className="size-3.5 ml-1 opacity-70"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => void download('pptx')}>
          <Presentation className="size-4 mr-2" strokeWidth={1.5} aria-hidden="true" />
          PowerPoint
        </DropdownMenuItem>
        {/* A deck whose preview render failed has no PDF at all, so asking for one is a
            guaranteed 404 rather than a slow path. */}
        <DropdownMenuItem onSelect={() => void download('pdf')} disabled={!hadPdf}>
          <FileDown className="size-4 mr-2" strokeWidth={1.5} aria-hidden="true" />
          PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Waits for the re-render to land.
 *
 * Watches `completedAt` rather than only the status: a deck that was already READY passes
 * through GENERATING and back, and polling can easily miss the middle. A changed completedAt
 * is the unambiguous signal that the files were replaced.
 */
async function waitForRender(deckId: string, previousCompletedAt: string): Promise<boolean> {
  const deadline = Date.now() + RENDER_TIMEOUT_MS

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_MS))
    const { data: deck } = await decksControllerGetDeck(deckId)

    if (deck.status === 'FAILED') return false
    if (deck.status === 'READY' && (deck.completedAt ?? '') !== previousCompletedAt) return true
  }
  return false
}
