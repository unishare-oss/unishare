/** Queue name. Also the Redis key prefix BullMQ derives its lists from. */
export const DECK_QUEUE = 'decks'

/**
 * Total concurrent generations across every worker, set via `setGlobalConcurrency`.
 *
 * This is the cost control AND the reason a queue position is meaningful: without a cap,
 * ten students clicking at once means ten concurrent model runs and ten times the spend,
 * and nobody is ever "waiting" for anything you could count.
 */
export const DECK_CONCURRENCY = 2

/** Per-user generations per calendar day. Counts attempts, not successes — see DecksService. */
export const DAILY_DECK_QUOTA = 3

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

export const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
