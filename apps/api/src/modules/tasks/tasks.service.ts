import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '@/prisma/prisma.service'
import { CronLockService } from '@/common/cron-lock.service'
import { runWithCronLock } from '@/common/run-with-cron-lock'
import { StorageService } from '@/modules/storage/storage.service'

/**
 * How long an anonymous user is spared regardless of session state.
 *
 * Guards the gap between the user row being created and its session row existing — during which
 * `sessions: { none: ... }` matches, because none is vacuously true for zero rows. An hour is far
 * longer than that write gap and far shorter than the daily cadence, so it costs nothing.
 */
export const ANONYMOUS_GRACE_MS = 60 * 60 * 1000

/**
 * Per-job cross-pod lock TTLs, in milliseconds.
 *
 * The binding constraint is the job's own CADENCE, not its runtime: a holder that crashes
 * mid-job keeps the lock until the TTL expires, so a TTL at or above the cadence would turn a
 * single crash into a permanently skipped job. Every value here is far below its cadence, so
 * the worst a crash costs is nothing at all for the daily jobs (24h of slack) and at most one
 * tick for the hourly one.
 *
 * The lower bound is looser than it looks. The TTL only has to cover the window in which the
 * two pods' clocks fire the same tick -- seconds -- plus enough headroom that the losing pod
 * reliably sees a held lock. Expiring mid-run is not a correctness problem for any of these:
 * every write below is an absolute `deleteMany` / `updateMany` against a predicate, so a
 * second pass simply matches nothing. Verified job by job, no incrementing write among them.
 *
 * The 00:00 / 00:05 / 00:15 / 00:20 stagger is preserved and cannot be undone by these values:
 * each job holds a DISTINCT key, so one job's lock -- live or dead -- is invisible to the
 * next. Keeping every daily TTL at 5 minutes also keeps each lock's maximum lifetime inside
 * its own 5-minute stagger slot, which costs nothing here and removes the question entirely.
 */
export const TASK_LOCK_TTL_MS = {
  /** Daily 00:00. One `deleteMany` on an indexed predicate -- sub-second. */
  'prune-old-notifications': 5 * 60 * 1000,
  /** Daily 00:05. One `deleteMany` -- sub-second. */
  'prune-expired-sessions': 5 * 60 * 1000,
  /**
   * Hourly. One `updateMany` -- sub-second. This is the only job whose cadence is close
   * enough to matter: 5 minutes is 1/12th of the hour, so a crashed holder is long gone
   * before the next tick.
   */
  'lift-expired-bans': 5 * 60 * 1000,
  /**
   * Daily 00:15. The longest of the five -- an S3 delete per file of every post soft-deleted
   * more than 90 days ago. Realistically seconds; 5 minutes is generous even for a backlog,
   * and overrunning it is harmless because the other pod is not due back for 24 hours.
   */
  'purge-deleted-content': 5 * 60 * 1000,
  /** Daily 00:20. One `deleteMany` with a `sessions: { none: ... }` sub-query -- seconds. */
  'prune-anonymous-users': 5 * 60 * 1000,
} as const

export type TaskLockName = keyof typeof TASK_LOCK_TTL_MS

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly cronLock: CronLockService,
  ) {}

  /**
   * Every `@Cron` below is registered in both replicas, so each one runs twice per tick today.
   * That wastes work -- it does not corrupt anything -- and `purgeDeletedContent` additionally
   * produces spurious "Failed to delete S3 file" warnings when the loser deletes an object the
   * winner already removed.
   */
  private runLocked(name: TaskLockName, job: () => Promise<void>): Promise<void> {
    return runWithCronLock(this.cronLock, name, TASK_LOCK_TTL_MS[name], this.logger, job)
  }

  // Prune read notifications older than 30 days
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async pruneOldNotifications() {
    await this.runLocked('prune-old-notifications', async () => {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 30)
      const { count } = await this.prisma.notification.deleteMany({
        where: { read: true, createdAt: { lt: cutoff } },
      })
      if (count > 0) this.logger.log(`Pruned ${count} old notifications`)
    })
  }

  // Delete expired auth sessions
  @Cron('0 5 0 * * *') // 00:05 daily
  async pruneExpiredSessions() {
    await this.runLocked('prune-expired-sessions', async () => {
      const { count } = await this.prisma.session.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      })
      if (count > 0) this.logger.log(`Pruned ${count} expired sessions`)
    })
  }

  // Lift temporary bans that have expired
  @Cron(CronExpression.EVERY_HOUR)
  async liftExpiredBans() {
    await this.runLocked('lift-expired-bans', async () => {
      const { count } = await this.prisma.user.updateMany({
        where: { banned: true, banExpires: { not: null, lt: new Date() } },
        data: { banned: false, banExpires: null, banReason: null },
      })
      if (count > 0) this.logger.log(`Lifted ${count} expired bans`)
    })
  }

  // Prune anonymous guest users with no active sessions.
  // Runs after pruneExpiredSessions (00:05) so most orphaned sessions are already gone.
  @Cron('0 20 0 * * *') // 00:20 daily
  async pruneAnonymousUsers() {
    await this.runLocked('prune-anonymous-users', async () => {
      const { count } = await this.prisma.user.deleteMany({
        where: {
          isAnonymous: true,
          // "No unexpired session" is the right rule — an age cutoff alone would delete an
          // anonymous user who has been signed in for more than the cutoff, mid-session.
          sessions: { none: { expiresAt: { gt: new Date() } } },
          // But `none` also matches a user with NO session rows at all, which is exactly the
          // state of an account in the moments between being created and having its session
          // written. Without this floor the job can delete a user who signed in seconds ago.
          createdAt: { lt: new Date(Date.now() - ANONYMOUS_GRACE_MS) },
        },
      })
      if (count > 0) this.logger.log(`Pruned ${count} anonymous users with no active sessions`)
    })
  }

  // Hard-delete soft-deleted posts (+ S3 files) and comments older than 90 days
  @Cron('0 15 0 * * *') // 00:15 daily
  async purgeDeletedContent() {
    await this.runLocked('purge-deleted-content', async () => {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 90)

      // Hard-delete soft-deleted comments on still-active posts
      const { count: commentCount } = await this.prisma.comment.deleteMany({
        where: { deletedAt: { lt: cutoff } },
      })

      // Find soft-deleted posts with their S3 files
      const posts = await this.prisma.post.findMany({
        where: { deletedAt: { lt: cutoff } },
        select: { id: true, files: { select: { key: true } } },
      })

      for (const post of posts) {
        for (const file of post.files) {
          await this.storage.deleteFile(file.key).catch((err) => {
            this.logger.warn(`Failed to delete S3 file ${file.key}: ${err.message}`)
          })
        }
      }

      // Hard-delete posts — cascade removes their DB files, comments, reactions, etc.
      const { count: postCount } = await this.prisma.post.deleteMany({
        where: { id: { in: posts.map((p) => p.id) } },
      })

      if (commentCount > 0 || postCount > 0) {
        this.logger.log(
          `Purged ${postCount} posts and ${commentCount} comments (soft-deleted >90d)`,
        )
      }
    })
  }
}
