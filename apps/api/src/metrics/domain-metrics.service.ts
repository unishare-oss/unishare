import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { Interval } from '@nestjs/schedule'
import { InjectMetric } from '@willsoto/nestjs-prometheus'
import { Gauge } from 'prom-client'
import { PrismaService } from '../prisma/prisma.service'

const POST_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const
const DECK_STATUSES = ['QUEUED', 'GENERATING', 'READY', 'FAILED'] as const

// Periodically samples business-level counts from the database into gauges so
// dashboards can track platform growth (users, posts by moderation status,
// comments, chat messages, decks by generation status) alongside the runtime/HTTP metrics.
@Injectable()
export class DomainMetricsService implements OnModuleInit {
  private readonly logger = new Logger(DomainMetricsService.name)

  constructor(
    private readonly prisma: PrismaService,
    @InjectMetric('unishare_users_total') private readonly users: Gauge<string>,
    @InjectMetric('unishare_posts_total') private readonly posts: Gauge<string>,
    @InjectMetric('unishare_comments_total') private readonly comments: Gauge<string>,
    @InjectMetric('unishare_chat_messages_total') private readonly chatMessages: Gauge<string>,
    @InjectMetric('unishare_decks_total') private readonly decks: Gauge<string>,
    @InjectMetric('unishare_decks_retried_total') private readonly decksRetried: Gauge<string>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.collect()
  }

  @Interval(30_000)
  async collect(): Promise<void> {
    try {
      const [users, comments, chatMessages, postsByStatus, decksByStatus, decksRetried] =
        await Promise.all([
          this.prisma.user.count(),
          this.prisma.comment.count(),
          this.prisma.chatMessage.count(),
          this.prisma.post.groupBy({ by: ['status'], _count: { _all: true } }),
          // Soft-deleted decks are excluded here, unlike the quota query: this gauge is
          // "what does the platform hold", not "what has a student spent".
          this.prisma.deck.groupBy({
            by: ['status'],
            where: { deletedAt: null },
            _count: { _all: true },
          }),
          // Retries are the single largest consumer of the provider's request budget, so they
          // are worth watching on their own rather than inferring from the failure count.
          this.prisma.deck.count({ where: { deletedAt: null, attempts: { gt: 1 } } }),
        ])

      this.users.set(users)
      this.comments.set(comments)
      this.chatMessages.set(chatMessages)
      this.decksRetried.set(decksRetried)

      // Zero out known statuses first so a status dropping to 0 is reflected.
      for (const status of POST_STATUSES) this.posts.set({ status }, 0)
      for (const row of postsByStatus) this.posts.set({ status: row.status }, row._count._all)

      for (const status of DECK_STATUSES) this.decks.set({ status }, 0)
      for (const row of decksByStatus) this.decks.set({ status: row.status }, row._count._all)
    } catch (err) {
      this.logger.warn(`Failed to collect domain metrics: ${String(err)}`)
    }
  }
}
