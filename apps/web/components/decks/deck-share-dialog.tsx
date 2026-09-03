'use client'

import { useState, type ReactNode } from 'react'
import { Check, Copy, Link2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  getDecksControllerGetDeckQueryKey,
  useDecksControllerCreateShareLink,
  useDecksControllerRevokeShareLink,
} from '@/src/lib/api/generated/decks/decks'
import type { DeckEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

/**
 * Creating and withdrawing a deck's share link.
 *
 * The link is deliberately NOT minted by opening this dialog. `createShareLink` is idempotent
 * upstream, so calling it on open would be harmless for a deck already shared — but for one
 * that is not, merely looking at the dialog would publish it. The deck carries `shareToken`
 * precisely so this can render the real state without a write.
 *
 * What the copy has to be honest about: the link serves the deck as of its last render. Slides
 * are edited in the generator's own cross-origin editor, so we cannot see edits — the same
 * reason downloads re-render first. A shared link cannot re-render on the recipient's behalf,
 * so it can be behind until the owner downloads again.
 */
export function DeckShareDialog({ deck, children }: { deck: DeckEntity; children: ReactNode }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const shareUrl = deck.shareToken
    ? `${typeof window === 'undefined' ? '' : window.location.origin}/d/${deck.shareToken}`
    : null

  async function refreshDeck() {
    await queryClient.invalidateQueries({ queryKey: getDecksControllerGetDeckQueryKey(deck.id) })
  }

  const { mutate: createLink, isPending: creating } = useDecksControllerCreateShareLink({
    mutation: {
      onSuccess: async () => {
        await refreshDeck()
        toast.success('Share link created')
      },
      onError: () => toast.error('Could not create the share link'),
    },
  })

  const { mutate: revokeLink, isPending: revoking } = useDecksControllerRevokeShareLink({
    mutation: {
      onSuccess: async () => {
        await refreshDeck()
        setCopied(false)
        toast.success('Share link revoked')
      },
      onError: () => toast.error('Could not revoke the share link'),
    },
  })

  async function copy() {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      // Long enough to read, short enough that the button is ready for a second copy.
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access is refused in some browsers unless the page is focused. The input is
      // right there and already selectable, so say that rather than failing silently.
      toast.error('Could not copy — select the link and copy it manually')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share this deck</DialogTitle>
          <DialogDescription>
            {shareUrl
              ? 'Anyone with this link can view and download the deck, with no account. It shows the deck as of its last render.'
              : 'Creates a link that lets anyone view and download this deck without an account. You can withdraw it at any time.'}
          </DialogDescription>
        </DialogHeader>

        {shareUrl && (
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={shareUrl}
              className="font-mono text-xs"
              aria-label="Share link"
            />
            <Button variant="outline" size="sm" onClick={copy} aria-label="Copy share link">
              {copied ? (
                <Check className="size-4" strokeWidth={1.5} aria-hidden="true" />
              ) : (
                <Copy className="size-4" strokeWidth={1.5} aria-hidden="true" />
              )}
            </Button>
          </div>
        )}

        <DialogFooter>
          {shareUrl ? (
            <Button
              variant="destructive"
              size="sm"
              disabled={revoking}
              onClick={() => revokeLink({ id: deck.id })}
            >
              {revoking && (
                <Loader2
                  className="size-4 mr-1.5 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              )}
              Revoke link
            </Button>
          ) : (
            <Button size="sm" disabled={creating} onClick={() => createLink({ id: deck.id })}>
              {creating ? (
                <Loader2
                  className="size-4 mr-1.5 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <Link2 className="size-4 mr-1.5" strokeWidth={1.5} aria-hidden="true" />
              )}
              Create share link
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
