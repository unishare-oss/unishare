import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import {
  UniauthDirectoryClient,
  ResyncRequired,
  type DirectoryIdentity,
} from './uniauth-directory.client'
import { UniauthIdentityEventsService } from './uniauth-identity-events.service'

const PAGE = 100

/**
 * Catches unishare up with uniauth's change feed: at startup and every UNIAUTH_RECONCILE_HOURS (default 6). It is the
 * safety net for events missed while offline or exhausted after retries. The cursor is saved after each page, so a
 * failure resumes where it stopped. The feed only reaches back to uniauth's retention (7 days); when the cursor is
 * older (410) every linked account is refreshed with batch reads and the feed is read again from the start (events
 * already applied are skipped by version).
 */
@Injectable()
export class UniauthReconcileService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(UniauthReconcileService.name)
  private timer?: ReturnType<typeof setInterval>

  constructor(
    private readonly prisma: PrismaService,
    private readonly directory: UniauthDirectoryClient,
    private readonly events: UniauthIdentityEventsService,
  ) {}

  onModuleInit() {
    if (!this.directory.enabled() || process.env.NODE_ENV === 'test') return
    const run = () =>
      this.reconcile().catch((error: unknown) =>
        this.logger.error(`reconciliation failed: ${String(error)}`),
      )
    void run()
    this.timer = setInterval(run, Number(process.env.UNIAUTH_RECONCILE_HOURS ?? 6) * 60 * 60 * 1000)
    this.timer.unref()
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer)
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
        if (entry?.result === 'deleted') await this.events.applyResync(userId, 'deleted', accountId)
        else if (entry?.result === 'found' && entry.identity) {
          if ((await this.events.applyResync(userId, entry.identity, accountId)) === 'applied')
            refreshed++
        }
      }
      after = accounts[accounts.length - 1]!.accountId
    }
  }

  async reconcile(): Promise<{ applied: number; resynced: boolean }> {
    let cursor =
      (await this.prisma.identityReconcile.findUnique({ where: { id: 1 } }))?.cursor ?? null
    let applied = 0
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
      const known = new Set<string>()
      for (const id of new Set(page.changes.map((c) => c.id))) {
        if (
          await this.prisma.account.findFirst({
            where: { providerId: 'uniauth', accountId: id },
            select: { id: true },
          })
        ) {
          known.add(id)
        }
      }
      // One batch read for the profiles of this page's updates.
      const profiles = known.size ? await this.directory.batch([...known]) : new Map()
      for (const change of page.changes) {
        if (!known.has(change.id)) continue
        const entry = profiles.get(change.id)
        const profile: DirectoryIdentity | null =
          entry?.result === 'deleted'
            ? ({ id: change.id, status: 'deleted', version: change.version } as DirectoryIdentity)
            : (entry?.identity ?? null)
        const outcome = await this.events.apply(
          {
            eventId: change.eventId,
            type: change.type,
            subject: change.id,
            identityVersion: change.version,
          },
          profile,
        )
        if (outcome === 'applied') applied++
      }
      cursor = page.cursor
      await this.save(cursor)
      if (!page.hasMore) return { applied, resynced }
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
