import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '@/prisma/prisma.service'
import { StorageService } from '@/modules/storage/storage.service'

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  // Prune read notifications older than 30 days
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async pruneOldNotifications() {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    const { count } = await this.prisma.notification.deleteMany({
      where: { read: true, createdAt: { lt: cutoff } },
    })
    if (count > 0) this.logger.log(`Pruned ${count} old notifications`)
  }

  // Delete expired auth sessions
  @Cron('0 5 0 * * *') // 00:05 daily
  async pruneExpiredSessions() {
    const { count } = await this.prisma.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    })
    if (count > 0) this.logger.log(`Pruned ${count} expired sessions`)
  }

  // Lift temporary bans that have expired
  @Cron(CronExpression.EVERY_HOUR)
  async liftExpiredBans() {
    const { count } = await this.prisma.user.updateMany({
      where: { banned: true, banExpires: { not: null, lt: new Date() } },
      data: { banned: false, banExpires: null, banReason: null },
    })
    if (count > 0) this.logger.log(`Lifted ${count} expired bans`)
  }

  // Prune anonymous guest users older than 7 days
  @Cron('0 20 0 * * *') // 00:20 daily
  async pruneAnonymousUsers() {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 7)
    const { count } = await this.prisma.user.deleteMany({
      where: { isAnonymous: true, createdAt: { lt: cutoff } },
    })
    if (count > 0) this.logger.log(`Pruned ${count} anonymous users older than 7 days`)
  }

  // Hard-delete soft-deleted posts (+ S3 files) and comments older than 90 days
  @Cron('0 15 0 * * *') // 00:15 daily
  async purgeDeletedContent() {
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
      this.logger.log(`Purged ${postCount} posts and ${commentCount} comments (soft-deleted >90d)`)
    }
  }
}
