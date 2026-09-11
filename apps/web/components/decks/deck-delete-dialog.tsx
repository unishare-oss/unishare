'use client'

import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { isDeckPending } from '@/lib/decks/waiting-state'
import {
  getDecksControllerListDecksQueryKey,
  useDecksControllerDeleteDeck,
} from '@/src/lib/api/generated/decks/decks'
import type { DeckEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

interface DeckDeleteDialogProps {
  deck: DeckEntity
  /** The control that opens the dialog. Rendered as the trigger, so it keeps its own styling. */
  children: ReactNode
  /**
   * Called once the deck is gone. The library leaves this out and lets the list refetch, but
   * the deck page has to navigate away — it polls the deck it is showing, and staying put
   * would send the next poll after a deck that no longer exists.
   */
  onDeleted?: () => void
}

export function DeckDeleteDialog({ deck, children, onDeleted }: DeckDeleteDialogProps) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const inFlight = isDeckPending(deck.status)

  const { mutate: deleteDeck, isPending } = useDecksControllerDeleteDeck({
    mutation: {
      onSuccess: async () => {
        setOpen(false)
        toast.success('Deck deleted')
        // Navigate first. The deck page polls the deck it is showing, so waiting on a refetch
        // before leaving is exactly the window in which that poll can fire at a deleted deck.
        onDeleted?.()
        // No params, so this matches every page of the library at once — deleting from page
        // three must not leave pages one and two showing the deck.
        await queryClient.invalidateQueries({ queryKey: getDecksControllerListDecksQueryKey() })
      },
      onError: () => toast.error('Could not delete the deck. Try again in a moment.'),
    },
  })

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this deck?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-text-muted">
              <p className="text-foreground font-medium line-clamp-2">
                {deck.title ?? deck.prompt}
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li>
                  The PowerPoint and preview are{' '}
                  <strong className="text-foreground">permanently removed</strong> — download
                  anything you want to keep first
                </li>
                {inFlight && (
                  <li>
                    This deck is still being made, and that{' '}
                    <strong className="text-foreground">will be stopped</strong>
                  </li>
                )}
                {/* Stated up front because it is the surprising part, and finding out
                    afterwards reads as a bug rather than as the rule it is. */}
                <li>
                  Your daily allowance{' '}
                  <strong className="text-foreground">is not given back</strong>
                </li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              // The dialog closes itself on click; without this the mutation would be torn
              // down mid-flight and the toast would never land.
              e.preventDefault()
              deleteDeck({ id: deck.id })
            }}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? 'Deleting...' : 'Delete deck'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
