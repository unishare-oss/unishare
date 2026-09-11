import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { Presentation } from 'lucide-react'
import { SharedDeckDownload } from '@/components/decks/shared-deck-download'
import { SharedDeckPreview } from '@/components/decks/shared-deck-preview'
import { DeckPreviewUnavailable } from '@/components/decks/deck-preview'

/**
 * A deck opened from a share link, by someone who may have no account.
 *
 * Server-rendered and unauthenticated, following the same shape as /s/[shortCode]: read
 * through the API, 404 on anything the API refuses. The API returns one message for a token
 * that is unknown, revoked or points at a deleted deck, so nothing here can leak which.
 *
 * Not under /decks on purpose. /decks lives in the (protected) group behind AuthGuard, and a
 * public page underneath it would either be bounced to a login or split that path across two
 * route groups for no reason.
 */

type ApiEnvelope<T> = { success: boolean; message: string; data: T }

interface SharedDeck {
  title: string | null
  slideCount: number
  template: string
  createdAt: string
  formats: string[]
}

function getBaseUrl(requestHeaders: Headers) {
  const apiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL
  if (apiUrl) return apiUrl

  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host')
  const proto = requestHeaders.get('x-forwarded-proto') ?? 'http'
  if (!host) return 'http://localhost:3000'
  return `${proto}://${host}`
}

export default async function SharedDeckPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const h = await headers()

  const res = await fetch(new URL(`/api/decks/shared/${token}`, getBaseUrl(h)), {
    // A revoked link has to stop working immediately, which a cached page would not.
    cache: 'no-store',
  })
  if (!res.ok) notFound()

  const deck = ((await res.json()) as ApiEnvelope<SharedDeck>).data

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <div className="flex flex-col gap-3">
        <span className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
          Shared deck
        </span>
        {/*
          Clamped to two lines. A deck keeps the prompt as its title until the owner renames
          it, and a prompt is a paragraph -- unclamped it becomes a heading that pushes the
          deck itself off the screen.
        */}
        <h1 className="line-clamp-2 text-xl font-semibold text-balance text-foreground sm:text-2xl">
          {deck.title ?? 'Untitled deck'}
        </h1>
        <p className="text-sm text-text-muted">
          {deck.slideCount} slides · {deck.template} ·{' '}
          {new Date(deck.createdAt).toLocaleDateString()}
        </p>
      </div>

      {/* The deck first. Everything else on this page is about the deck. */}
      {deck.formats.includes('pdf') ? (
        <SharedDeckPreview token={token} />
      ) : (
        <DeckPreviewUnavailable />
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SharedDeckDownload token={token} formats={deck.formats} />
        <p className="flex items-start gap-2 text-xs text-text-muted sm:max-w-sm">
          <Presentation className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
          <span>This is the deck as of its last render. The owner may have edited it since.</span>
        </p>
      </div>
    </div>
  )
}
