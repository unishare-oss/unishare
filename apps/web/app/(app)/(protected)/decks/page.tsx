'use client'

import Link from 'next/link'
import { keepPreviousData } from '@tanstack/react-query'
import { useState } from 'react'
import { AlertCircle, ChevronLeft, ChevronRight, Plus, Presentation } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { DeckCard } from '@/components/decks/deck-card'
import { DeckCardSkeleton } from '@/components/decks/deck-card-skeleton'
import { isDeckPending } from '@/lib/decks/waiting-state'
import {
  useDecksControllerGetQuota,
  useDecksControllerListDecks,
} from '@/src/lib/api/generated/decks/decks'
import type { DeckEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

const PAGE_SIZE = 12
const POLL_MS = 6000

export default function DecksPage() {
  const [page, setPage] = useState(1)

  const { data: quota } = useDecksControllerGetQuota({ query: { select: (r) => r.data } })

  const { data, isLoading, isError } = useDecksControllerListDecks(
    { page, limit: PAGE_SIZE },
    {
      query: {
        select: (r) => r.data,
        placeholderData: keepPreviousData,
        // One poll for the whole page instead of one per card. `select` never reaches the
        // refetch scheduler, so this has to read the raw envelope — and the list payload is
        // nested twice ({ data: { data: DeckEntity[] } }) because the page itself is wrapped.
        refetchInterval: (query) => {
          const decks = (query.state.data as { data?: { data?: DeckEntity[] } } | undefined)?.data
            ?.data
          return decks?.some((d) => isDeckPending(d.status)) ? POLL_MS : false
        },
      },
    },
  )

  const decks = data?.data
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const showSkeleton = isLoading
  const showEmpty = !showSkeleton && !isError && !decks?.length
  const showGrid = !showSkeleton && !!decks?.length

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="Decks"
        subtitle={
          quota
            ? `${quota.used} of ${quota.limit} used today${total > 0 ? ` · ${total} in your library` : ''}`
            : undefined
        }
        action={
          <Button size="sm" asChild>
            <Link href="/decks/new">
              <Plus className="size-4 mr-1.5" strokeWidth={1.5} aria-hidden="true" />
              New deck
            </Link>
          </Button>
        }
      />

      <div className="flex-1 bg-card">
        <div className="p-6 space-y-6">
          {isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your decks could not be loaded. Check your connection and try again.
              </AlertDescription>
            </Alert>
          )}

          {showSkeleton && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <DeckCardSkeleton />
              <DeckCardSkeleton />
              <DeckCardSkeleton />
            </div>
          )}

          {showEmpty && (
            <div className="flex flex-col items-center">
              <EmptyState
                icon={Presentation}
                message="No decks yet"
                description="Describe a topic and the generator builds a slide deck you can edit and download."
              />
              {/* EmptyState carries py-20 of its own, so the CTA is pulled back up to read
                  as part of the same block. */}
              <Button size="sm" asChild className="-mt-12">
                <Link href="/decks/new">
                  <Plus className="size-4 mr-1.5" strokeWidth={1.5} aria-hidden="true" />
                  Generate your first deck
                </Link>
              </Button>
            </div>
          )}

          {showGrid && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {decks.map((deck) => (
                <DeckCard key={deck.id} deck={deck} />
              ))}
            </div>
          )}

          {showGrid && totalPages > 1 && (
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-3.5 mr-1.5" strokeWidth={1.5} aria-hidden="true" />
                Previous
              </Button>
              <span className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <ChevronRight className="size-3.5 ml-1.5" strokeWidth={1.5} aria-hidden="true" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
