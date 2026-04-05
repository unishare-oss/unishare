import { Injectable, Logger } from '@nestjs/common'
import { Post, Prisma } from '@/generated/prisma/client'
import { PrismaService } from '@/prisma/prisma.service'

@Injectable()
export class TrendingService {
  private readonly logger = new Logger(TrendingService.name)

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Refresh trending scores for all published posts.
   * Called every 5 minutes via scheduled task.
   *
   * Formula: score = (views * 0.3 + reactions * 0.7) * time_decay_factor
   * time_decay_factor = 1.0 - (hours_since_creation / 168)  (1 week half-life)
   */
  async refreshTrendingScores(): Promise<void> {
    this.logger.log('[TrendingService] Refreshing trending scores...')

    try {
      const posts = await this.prisma.post.findMany({
        where: {
          publicationStatus: 'PUBLISHED',
          deletedAt: null,
        },
        select: {
          id: true,
          views: true,
          createdAt: true,
          _count: { select: { reactions: true } },
        },
      })

      const now = Date.now()
      const scoreUpdates = posts.map((post) => {
        const hoursSinceCreation = (now - post.createdAt.getTime()) / (1000 * 60 * 60)

        // Time decay factor: 1.0 - (hours / 168) → half-life at 7 days
        // Prevents negative: cap at 0
        const timeDecayFactor = Math.max(1.0 - hoursSinceCreation / 168, 0.1)

        // Reaction count is higher signal than views
        const reactionCount = post._count.reactions

        // Base score: (views * 0.3 + reactions * 0.7)
        const engagementScore = post.views * 0.3 + reactionCount * 0.7

        // Apply time decay
        const trendingScore = engagementScore * timeDecayFactor

        return this.prisma.post.update({
          where: { id: post.id },
          data: { trendingScore },
        })
      })

      await this.prisma.$transaction(scoreUpdates)
      this.logger.log(`[TrendingService] Refreshed scores for ${posts.length} posts`)
    } catch (error) {
      this.logger.error('[TrendingService] Error refreshing scores', error)
      throw error
    }
  }

  /**
   * Get trending posts with pagination.
   * Returns posts with highest trending scores, most recent first for ties.
   */
  async getTrendingPosts(limit: number = 20, page: number = 1) {
    const skip = (page - 1) * limit

    const include: Prisma.PostInclude = {
      author: {
        select: {
          id: true,
          name: true,
          image: true,
          enrollmentYear: true,
          department: { select: { id: true, name: true } },
        },
      },
      course: {
        select: {
          id: true,
          code: true,
          name: true,
          department: { select: { id: true, name: true } },
        },
      },
      files: {
        select: {
          id: true,
          key: true,
          name: true,
          size: true,
          mimeType: true,
          createdAt: true,
          downloads: true,
        },
      },
      reactions: { select: { type: true, userId: true } },
      tags: { select: { tag: { select: { id: true, name: true, slug: true, color: true } } } },
      _count: { select: { comments: { where: { deletedAt: null } }, savedBy: true } },
    }

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where: { publicationStatus: 'PUBLISHED', deletedAt: null },
        orderBy: [{ trendingScore: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        include,
      }),
      this.prisma.post.count({
        where: {
          publicationStatus: 'PUBLISHED',
          deletedAt: null,
        },
      }),
    ])

    return {
      posts: posts.map((p) => {
        const { reactions, savedBy, ...rest } = p as any
        const reactionCounts: Record<string, number> = {}
        for (const r of reactions ?? []) {
          reactionCounts[r.type] = (reactionCounts[r.type] ?? 0) + 1
        }
        return {
          ...rest,
          tags: (rest.tags ?? []).map((pt: any) => pt.tag),
          savedByCurrentUser: Array.isArray(savedBy) && savedBy.length > 0,
          reactionCounts,
          userReaction: null,
          isOwner: false,
        }
      }),
      total,
      page,
      limit,
    }
  }

  /**
   * Calculate trending score for a single post.
   * Used for testing and debugging.
   */
  private calculateTrendingScore(post: Post, reactionCount: number, _commentCount: number): number {
    const now = Date.now()
    const hoursSinceCreation = (now - post.createdAt.getTime()) / (1000 * 60 * 60)

    const timeDecayFactor = Math.max(1.0 - hoursSinceCreation / 168, 0.1)
    const engagementScore = post.views * 0.3 + reactionCount * 0.7

    return engagementScore * timeDecayFactor
  }
}
