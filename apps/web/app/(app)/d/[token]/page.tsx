import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { Presentation } from 'lucide-react'
import { SharedDeckDownload } from '@/components/decks/shared-deck-download'

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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-16">
      <div className="flex flex-col gap-3">
        <span className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
          Shared deck
        </span>
        <h1 className="text-2xl font-semibold text-foreground">{deck.title ?? 'Untitled deck'}</h1>
        <p className="text-sm text-text-muted">
          {deck.slideCount} slides · {deck.template} ·{' '}
          {new Date(deck.createdAt).toLocaleDateString()}
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-xl bg-card p-4">
        <Presentation className="size-5 text-text-muted" strokeWidth={1.5} aria-hidden="true" />
        <p className="min-w-0 flex-1 text-sm text-text-muted">
          This is the deck as of its last render. The owner may have edited it since.
        </p>
      </div>

      <SharedDeckDownload token={token} formats={deck.formats} />
    </div>
  )
}
