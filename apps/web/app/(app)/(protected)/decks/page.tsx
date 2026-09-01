'use client'

import { formatDistanceToNow } from 'date-fns'
import { PageHeader } from '@/components/shared/page-header'
import { DeckCard } from '@/components/decks/deck-card'
import { DeckCreateForm } from '@/components/decks/deck-create-form'
import {
  useDecksControllerGetQuota,
  useDecksControllerListDecks,
} from '@/src/lib/api/generated/decks/decks'

const LIST_POLL_MS = 8000

export default function DecksPage() {
  const { data: quota } = useDecksControllerGetQuota({
    query: { select: (r) => r.data },
  })

  const { data: decks } = useDecksControllerListDecks(
    { page: 1, limit: 20 },
    {
      query: {
        select: (r) => r.data,
        // The cards poll themselves for status; this refetch is only so a deck that finished
        // in another tab (or before this page mounted) appears without a manual reload.
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
      />

      {quota && (
        <p className="text-sm text-muted-foreground">
          {used} of {limit} used today
          {exhausted && resetsIn ? ` · resets ${resetsIn}` : ''}
        </p>
      )}

      <DeckCreateForm
        disabled={exhausted}
        disabledReason={
          resetsIn
            ? `You have used all ${limit} decks for today. Your allowance resets ${resetsIn}.`
            : undefined
        }
      />

      <div className="space-y-3">
        {decks?.data.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No decks yet. Generate your first one above.
          </p>
        )}
        {decks?.data.map((deck) => (
          <DeckCard key={deck.id} deck={deck} />
        ))}
      </div>
    </div>
  )
}
