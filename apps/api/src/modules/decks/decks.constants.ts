/** Queue name. Also the Redis key prefix BullMQ derives its lists from. */
export const DECK_QUEUE = 'decks'

/**
 * Re-rendering has its own queue.
 *
 * Every download re-renders first, so a render is on the critical path of a student waiting
 * for a file. On the generate queue it would wait behind a model call measured in minutes and
 * deliberately limited to one at a time. A render costs no tokens, so it needs the isolation
 * rather than the restraint.
 */
export const DECK_RENDER_QUEUE = 'decks-render'

/**
 * Higher than DECK_CONCURRENCY because nothing here is billed. The ceiling is the generator's
 * own CPU on a small box, not a provider's token budget, so a couple at once is plenty and
 * many at once would just make every render slower.
 */
export const RENDER_CONCURRENCY = 2

/** Job names on the shared queue. Re-export is a render, generate is a model run. */
export const GENERATE_JOB = 'generate'
export const REEXPORT_JOB = 'reexport'

/**
 * Total concurrent generations across every worker, set via `setGlobalConcurrency`.
 *
 * ONE, not two, and the reason is measured rather than cautious: the model provider's free
 * tier allows 8000 tokens per minute, and it bills the RESERVATION (prompt +
 * max_completion_tokens), not actual usage. At ~1500 per call that is about five calls a
 * minute, and a single deck needs one call for the outline plus one per slide. Two decks
 * running at once cannot both fit, so the second does not merely run slowly — it takes the
 * first one down with it, because a mid-generation 429 fails the whole deck rather than the
 * slide.
 *
 * Raise this only alongside a paid provider tier. It is a throughput knob that looks free
 * and is not.
 */
export const DECK_CONCURRENCY = 1

/**
 * Per-user generations per rolling 24h. Counts decks that are queued, running or finished —
 * NOT failures. A deck that errored gave the student nothing, and charging them for our
 * provider's flakiness is indefensible when they cannot even retry for free.
 */
export const DAILY_DECK_QUOTA = 3

/**
 * The rolling window both allowances are measured over.
 *
 * A rolling 24 hours rather than a calendar day, for two reasons: it sidesteps the question of
 * whose midnight (the users are not in UTC), and it cannot be gamed by spending the whole
 * allowance at 23:59 and the next one at 00:01.
 */
export const QUOTA_WINDOW_MS = 24 * 60 * 60 * 1000

/**
 * Per-user AI slide edits per rolling 24h, enforced on the embedded editor's own model calls.
 *
 * Higher than DAILY_DECK_QUOTA because an edit rewrites one slide rather than authoring a deck,
 * so it is a fraction of the tokens — but capped all the same: these calls bypass the queue
 * entirely, and the provider's per-minute token budget is shared with every deck waiting to
 * generate. One student looping a rewrite would fail everyone else's decks.
 */
export const AI_EDIT_DAILY_CAP = 20

/**
 * Retries per deck. Generation reaches out to a model provider over a multi-minute request,
 * so transient failures are expected rather than exceptional; without retries a single blip
 * kills a deck permanently.
 */
export const MAX_ATTEMPTS = 3

/** Exponential base. 30s, 60s — long enough for a provider hiccup to pass. */
export const RETRY_BACKOFF_MS = 30_000

export const MIN_SLIDES = 3
export const MAX_SLIDES = 15
export const DEFAULT_SLIDES = 8

/**
 * Measured against the live instance: ~57s for 3 slides, ~114s for 8. Used only to show a
 * range, never as a promise — a precise countdown that drifts reads worse than a vague one.
 */
export const AVG_SECONDS_PER_SLIDE = 18

/**
 * How far into the waiting list to look for a job before giving up on an exact position.
 * Beyond this the UI says "more than N ahead" rather than scanning an unbounded list on
 * every poll.
 */
export const WAITING_SCAN_LIMIT = 200

/** Mirrors the generator's accepted values; validated at the DTO so a typo fails fast. */
export const TONES = [
  'default',
  'casual',
  'professional',
  'funny',
  'educational',
  'sales_pitch',
] as const

export const VERBOSITIES = ['concise', 'standard', 'text-heavy'] as const

export const PDF_MIME = 'application/pdf'

export const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
