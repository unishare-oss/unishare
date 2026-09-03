/**
 * The one place a deck's status becomes words.
 *
 * A deck can be "not finished yet" for four unrelated reasons, and telling a student the
 * wrong one is worse than telling them nothing: a queue position on a deck that is actually
 * waiting for tomorrow's allowance reads as a stuck line, and an error banner on a deck the
 * worker is about to retry reads as a dead deck. Both the library card and the deck page
 * derive their copy here so the two can never drift apart.
 */

import {
  AlertCircle,
  Clock,
  Loader2,
  RefreshCw,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { DeckEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

export type DeckWaitKind =
  /** An attempt failed and the worker is trying again on its own. Not a failure. */
  | 'retrying'
  /** Accepted, but held until the owner's daily allowance frees. A clock, not a line. */
  | 'quota-held'
  /** In line behind other people's decks. A line, not a clock. */
  | 'queued'
  /** In line with nothing ahead of it — "0 ahead of you" for two minutes looks broken. */
  | 'starting'
  /** Actively running. Nothing to count, so nothing is counted. */
  | 'generating'
  /** Re-rendering the exports after an edit. Slides exist already; only the files change. */
  | 'rerendering'

export interface DeckWaitState {
  kind: DeckWaitKind
  /** The single line a student reads. Quantified wherever the API gives us a number. */
  message: string
  /** Extra context that must not compete with the message — the provider error, usually. */
  detail?: string
  icon: LucideIcon
  /** Spin the icon only when it stands for work in flight, never for a clock or a queue. */
  spin: boolean
  /** `warning` renders amber: something went wrong, even though recovery is automatic. */
  tone: 'progress' | 'warning'
}

/**
 * A range, never a countdown. A precise estimate that drifts reads worse than a vague one —
 * the API's own etaSeconds is built from an average seconds-per-slide, so pretending to
 * minute precision would be dressing up an average as a promise.
 */
export function formatEta(seconds: number | null | undefined): string | null {
  if (!seconds || seconds <= 0) return null
  const low = Math.max(1, Math.round((seconds * 0.8) / 60))
  const high = Math.max(low + 1, Math.round((seconds * 1.3) / 60))
  return `about ${low}-${high} min`
}

/** True while the deck is still moving, and therefore worth polling for. */
export function isDeckPending(status: DeckEntity['status']): boolean {
  return status === 'QUEUED' || status === 'GENERATING'
}

export function isDeckQuotaHeld(deck: DeckEntity, now: number = Date.now()): boolean {
  return Boolean(deck.scheduledFor) && new Date(deck.scheduledFor!).getTime() > now
}

/**
 * A re-render of a deck that already finished once, rather than a first generation.
 *
 * The API reuses GENERATING for both (requestReexport flips the status back), and the only
 * thing that separates them is that a deck which has completed before carries a completedAt.
 * It matters because a re-render must not hide the slides the student is in the middle of
 * editing, and must not be described as building the deck from the prompt again.
 */
export function isDeckRerendering(deck: DeckEntity): boolean {
  return deck.status === 'GENERATING' && Boolean(deck.completedAt)
}

/**
 * The deck has files from some earlier render, so preview and downloads still work.
 *
 * `canEdit` is what carries the FAILED case: the generator's own id is stored only when a
 * generation has fully succeeded, so a FAILED deck that has one must have failed on a later
 * re-render — and it still has everything from the render before that.
 */
export function hasRenderedFiles(deck: DeckEntity): boolean {
  if (deck.status === 'READY') return true
  if (isDeckRerendering(deck)) return true
  return deck.status === 'FAILED' && deck.canEdit
}

/** A FAILED deck that had already rendered once — the failure was a re-render, not the deck. */
export function isRerenderFailure(deck: DeckEntity): boolean {
  return deck.status === 'FAILED' && deck.canEdit
}

/**
 * `null` for decks that are finished, one way or the other — READY and FAILED are outcomes
 * with their own treatment, not waits.
 *
 * Precedence: a retry outranks whichever wait it happens to coincide with. A retrying deck
 * may also be quota-held or hold a queue position, but "an attempt failed" is the fact that
 * changes what the student expects, so it leads and the position is dropped rather than
 * stacked into a sentence nobody can parse.
 */
export function deckWaitState(deck: DeckEntity, now: number = Date.now()): DeckWaitState | null {
  if (deck.status === 'READY' || deck.status === 'FAILED') return null

  if (isDeckRerendering(deck)) {
    return {
      kind: 'rerendering',
      message: 'Re-rendering your edits — the preview and downloads update when it finishes',
      detail: 'The slides you edited are already saved; only the exported files are rebuilt.',
      icon: RefreshCw,
      spin: true,
      tone: 'progress',
    }
  }

  if (deck.status === 'GENERATING') {
    return {
      kind: 'generating',
      message: generatingMessage(deck),
      icon: Sparkles,
      spin: false,
      tone: 'progress',
    }
  }

  const attempts = deck.attempts ?? 0
  if (attempts > 0 && deck.error) {
    const attempt = Math.min(attempts + 1, deck.maxAttempts)
    return {
      kind: 'retrying',
      message: `Attempt ${attempt} of ${deck.maxAttempts} — retrying automatically after an error`,
      detail: deck.error,
      icon: AlertCircle,
      spin: false,
      tone: 'warning',
    }
  }

  if (isDeckQuotaHeld(deck, now)) {
    const startsIn = formatDistanceToNow(new Date(deck.scheduledFor!), { addSuffix: true })
    return {
      kind: 'quota-held',
      message: `Waiting for your daily allowance — starts ${startsIn}`,
      detail: 'Nothing to do: it starts on its own, and you can close this page.',
      icon: Clock,
      spin: false,
      tone: 'progress',
    }
  }

  const ahead = deck.queueAhead
  if (ahead == null) {
    // Both the list and single-deck endpoints compute a position now, so reaching here
    // means the queue itself could not be read (Redis down, or the job already left the
    // waiting list). Saying "waiting" beats inventing a number.
    return {
      kind: 'queued',
      message: 'Waiting in the queue — starts as soon as a slot frees',
      icon: Users,
      spin: false,
      tone: 'progress',
    }
  }

  if (ahead === 0) {
    return {
      kind: 'starting',
      message: 'Starting shortly',
      icon: Loader2,
      spin: true,
      tone: 'progress',
    }
  }

  const count = deck.queueAheadIsApproximate ? `More than ${ahead}` : `${ahead}`
  const eta = formatEta(deck.etaSeconds)
  return {
    kind: 'queued',
    message: `${count} ${ahead === 1 ? 'deck' : 'decks'} ahead of yours${eta ? ` · ${eta}` : ''}`,
    icon: Users,
    spin: false,
    tone: 'progress',
  }
}

/**
 * What a generating deck says it is doing.
 *
 * The worker polls the generator and stores what it hears, so this is reported progress
 * rather than a percentage derived from elapsed time. That distinction is the point: a deck
 * writes its slides in small batches with a deliberate pause between them, so a
 * time-based bar would race ahead and then sit at 99% for a minute.
 *
 * Everything here degrades to the old sentence. Progress is null on a deck that has not been
 * heard from yet, on a deck generated before this existed, and whenever the generator says
 * something we do not recognise — none of which is a broken deck, so none of it should look
 * like one.
 */
function generatingMessage(deck: DeckEntity): string {
  const total = deck.progressTotal ?? deck.slideCount
  const done = deck.progressDone ?? 0

  switch (deck.progressPhase) {
    case 'outline':
      return 'Planning what the slides will cover'
    case 'layout':
      return 'Choosing a layout for each slide'
    case 'slides':
      // Counts slides FINISHED, not the one in flight. "1 of 8 written" the moment the first
      // one lands is true; "writing slide 2 of 8" would be a guess about what happens next.
      return `Writing slides — ${done} of ${total} done`
    case 'assets':
      return 'Adding images to the slides'
    case 'finishing':
      return 'Putting the deck together'
    case 'starting':
      return 'Starting up'
    default:
      return `Building ${total} slides — usually a couple of minutes`
  }
}
