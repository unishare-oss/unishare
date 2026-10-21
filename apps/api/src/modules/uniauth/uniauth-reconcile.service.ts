import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { CronLockService } from '@/common/cron-lock.service'
import { runWithCronLock } from '@/common/run-with-cron-lock'
import { PrismaService } from '@/prisma/prisma.service'
import {
  UniauthDirectoryClient,
  ResyncRequired,
  type DirectoryChange,
  type DirectoryIdentity,
} from './uniauth-directory.client'
import { NotYetConsistent, UniauthIdentityEventsService } from './uniauth-identity-events.service'

const PAGE = 100
/** setInterval cannot take more than a signed 32-bit number of milliseconds. */
const MAX_INTERVAL_MS = 2 ** 31 - 1
/** Receipts only dedupe redeliveries, which stop within uniauth's 72 h window. */
const RECEIPT_RETENTION_MS = 14 * 24 * 60 * 60 * 1000
/** Cross-pod lock TTLs: a reconcile pass is a few queries and batch reads; the prune is one indexed deleteMany. */
const RECONCILE_LOCK_TTL_MS = 10 * 60 * 1000
const PRUNE_LOCK_TTL_MS = 5 * 60 * 1000

/**
 * UNIAUTH_RECONCILE_HOURS as milliseconds: empty means the default of 6 hours; otherwise a positive number (a mistake is a
 * startup error, not a timer that fires every millisecond or never), capped at what a timer can hold.
 */
export function reconcileIntervalMs(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === '') return 6 * 60 * 60 * 1000
  const hours = Number(raw)
  if (!Number.isFinite(hours) || hours <= 0) {
    throw new Error(`UNIAUTH_RECONCILE_HOURS must be a positive number, got: ${raw}`)
  }
  return Math.min(Math.round(hours * 60 * 60 * 1000), MAX_INTERVAL_MS)
}

const isChange = (c: Partial<DirectoryChange> | null): c is DirectoryChange =>
  !!c &&
  typeof c.eventId === 'string' &&
  typeof c.type === 'string' &&
  typeof c.id === 'string' &&
  Number.isInteger(c.version)

export interface ReconcileResult {
  applied: number
  /** Entries skipped (malformed, or a profile that could not be read): logged and counted, never wedging the cursor. */
  skipped: number
  resynced: boolean
  /** True if it stopped before a page because the directory is behind the feed (retried at the next run). */
  stopped: boolean
}

/**
 * Catches unishare up with uniauth's change feed: at startup and every UNIAUTH_RECONCILE_HOURS (default 6), once across the
 * pods (cron lock) and never overlapping itself. It is the safety net for events missed while offline or exhausted after
 * retries. The cursor is saved after each page, so a failure resumes where it stopped. The feed only reaches back to
 * uniauth's retention (7 days); when the cursor is older (410) every linked account is refreshed with batch reads and the
 * feed is read again from the start (events already applied are skipped by version).
 *
 * One bad entry must not wedge the feed. The choice made here: an entry that is malformed, or whose profile cannot be read
 * for a person unishare knows, is SKIPPED, logged and counted (`skipped`); the cursor moves on and the next event for that
 * person, or the 410 resync, repairs it. A transient inconsistency (the directory is behind the change) is different:
 * reconciliation STOPS before that page without saving its cursor, and the next run retries it.
 */
@Injectable()
export class UniauthReconcileService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(UniauthReconcileService.name)
  private timer?: ReturnType<typeof setInterval>
  private running = false

  constructor(
    private readonly prisma: PrismaService,
    private readonly directory: UniauthDirectoryClient,
    private readonly events: UniauthIdentityEventsService,
    private readonly cronLock: CronLockService,
  ) {}

  onModuleInit() {
    if (!this.directory.enabled() || process.env.NODE_ENV === 'test') return
    const interval = reconcileIntervalMs(process.env.UNIAUTH_RECONCILE_HOURS)
    void this.run()
    this.timer = setInterval(() => void this.run(), interval)
    this.timer.unref()
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer)
  }

  /** One scheduled pass: not while the previous one still runs here, and once across the pods. */
  async run(): Promise<void> {
    if (this.running) return
    this.running = true
    try {
      await runWithCronLock(
        this.cronLock,
        'uniauth-reconcile',
        RECONCILE_LOCK_TTL_MS,
        this.logger,
        async () => {
          await this.reconcile()
        },
      )
    } catch (error) {
      this.logger.error(`reconciliation failed: ${String(error)}`)
    } finally {
      this.running = false
    }
  }

  /** Receipts older than 14 days are dropped (daily, once across the pods, like the other prune jobs). */
  @Cron('0 35 0 * * *')
  async pruneReceipts(): Promise<void> {
    await runWithCronLock(
      this.cronLock,
      'prune-identity-receipts',
      PRUNE_LOCK_TTL_MS,
      this.logger,
      async () => {
        const { count } = await this.prisma.identityEventReceipt.deleteMany({
          where: { receivedAt: { lt: new Date(Date.now() - RECEIPT_RETENTION_MS) } },
        })
        if (count > 0) this.logger.log(`Pruned ${count} identity event receipts`)
      },
    )
  }

  /** Refreshes every locally linked uniauth account from batch reads. */
  async resync(): Promise<number> {
    let after: string | null = null
    let refreshed = 0
    for (;;) {
      const accounts: { accountId: string; userId: string }[] = await this.prisma.account.findMany({
        where: { providerId: 'uniauth', ...(after && { accountId: { gt: after } }) },
        select: { accountId: true, userId: true },
        orderBy: { accountId: 'asc' },
        take: PAGE,
      })
      if (!accounts.length) return refreshed
      const results = await this.directory.batch(accounts.map((a) => a.accountId))
      for (const { accountId, userId } of accounts) {
        const entry = results.get(accountId)
        if (entry?.result === 'deleted' || entry?.identity?.status === 'deleted') {
          await this.events.applyResync(userId, 'deleted', accountId)
        } else if (entry?.result === 'found' && entry.identity) {
          if ((await this.events.applyResync(userId, entry.identity, accountId)) === 'applied')
            refreshed++
        }
      }
      after = accounts[accounts.length - 1]!.accountId
    }
  }

  async reconcile(): Promise<ReconcileResult> {
    let cursor =
      (await this.prisma.identityReconcile.findUnique({ where: { id: 1 } }))?.cursor ?? null
    let applied = 0
    let skipped = 0
    let resynced = false
    for (;;) {
      let page
      try {
        page = await this.directory.changes(cursor, PAGE)
      } catch (error) {
        if (!(error instanceof ResyncRequired) || resynced) throw error
        await this.resync()
        resynced = true
        cursor = null
        await this.save(null)
        continue
      }
      const changes = page.changes.filter((c) => {
        if (isChange(c)) return true
        skipped++
        this.logger.warn(`skipped a malformed change entry: ${JSON.stringify(c)}`)
        return false
      })
      // One query for who unishare knows, one batch read for the profiles of this page's updates.
      const accounts = changes.length
        ? await this.prisma.account.findMany({
            where: {
              providerId: 'uniauth',
              accountId: { in: [...new Set(changes.map((c) => c.id))] },
            },
            select: { accountId: true, userId: true },
          })
        : []
      const users = new Map(accounts.map((a) => [a.accountId, a.userId]))
      const updated = [
        ...new Set(
          changes.filter((c) => c.type === 'identity.updated' && users.has(c.id)).map((c) => c.id),
        ),
      ]
      const profiles = updated.length ? await this.directory.batch(updated) : new Map()
      for (const change of changes) {
        const userId = users.get(change.id)
        if (!userId) continue
        let profile: DirectoryIdentity | null | undefined
        if (change.type === 'identity.updated') {
          const entry = profiles.get(change.id)
          profile = entry?.identity ?? null
          if (!profile) {
            skipped++
            this.logger.warn(
              `skipped ${change.eventId}: no profile for ${change.id} (${entry?.result ?? 'missing'})`,
            )
            continue
          }
        }
        try {
          const outcome = await this.events.apply(
            {
              eventId: change.eventId,
              type: change.type,
              subject: change.id,
              identityVersion: change.version,
            },
            { profile, userId },
          )
          if (outcome === 'applied') applied++
        } catch (error) {
          if (error instanceof NotYetConsistent) {
            this.logger.warn('the directory is behind the feed; stopping before this page')
            return { applied, skipped, resynced, stopped: true }
          }
          throw error
        }
      }
      cursor = page.cursor
      await this.save(cursor)
      if (!page.hasMore) return { applied, skipped, resynced, stopped: false }
    }
  }

  private save(cursor: string | null) {
    return this.prisma.identityReconcile.upsert({
      where: { id: 1 },
      create: { id: 1, cursor },
      update: { cursor },
    })
  }
}
