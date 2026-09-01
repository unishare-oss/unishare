'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { DeckCard } from '@/components/decks/deck-card'
import {
  useDecksControllerGetQuota,
  useDecksControllerListDecks,
} from '@/src/lib/api/generated/decks/decks'

const LIST_POLL_MS = 8000

export default function DecksPage() {
  const { data: quota } = useDecksControllerGetQuota({ query: { select: (r) => r.data } })
  const { data: decks } = useDecksControllerListDecks(
    { page: 1, limit: 30 },
    {
      query: {
        select: (r) => r.data,
        // The cards poll themselves for status; this is only so a deck that finished in
        // another tab appears without a manual reload.
        refetchInterval: LIST_POLL_MS,
      },
    },
  )

  const used = quota?.used ?? 0
  const limit = quota?.limit ?? 0
  const exhausted = Boolean(quota) && used >= limit
  const resetsIn = quota?.resetsAt
    ? formatDistanceToNow(new Date(quota.resetsAt), { addSuffix: true })
    : null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Decks"
        subtitle="Generate a slide deck on any topic. It runs in the background — you can leave this page."
        action={
          <Button asChild disabled={exhausted}>
            <Link href="/decks/new">
              <Plus className="mr-2 size-4" />
              New deck
            </Link>
          </Button>
        }
      />

      {quota && (
        <p className="text-sm text-muted-foreground">
          {used} of {limit} used today
          {exhausted && resetsIn ? ` · resets ${resetsIn}` : ''}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {decks?.data.map((deck) => (
          <DeckCard key={deck.id} deck={deck} />
        ))}
      </div>

      {decks?.data.length === 0 && (
        <div className="rounded-lg border border-dashed border-border py-12 text-center">
          <p className="text-sm text-muted-foreground">No decks yet.</p>
          <Button asChild variant="secondary" className="mt-4">
            <Link href="/decks/new">Generate your first deck</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
