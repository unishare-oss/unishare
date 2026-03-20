import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { Post } from '@/generated/prisma/client'

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
        include: {
          reactions: true,
          comments: true,
        },
      })

      const now = Date.now()
      const scoreUpdates = posts.map((post) => {
        const hoursSinceCreation = (now - post.createdAt.getTime()) / (1000 * 60 * 60)

        // Time decay factor: 1.0 - (hours / 168) → half-life at 7 days
        // Prevents negative: cap at 0
        const timeDecayFactor = Math.max(1.0 - hoursSinceCreation / 168, 0.1)

        // Reaction count is higher signal than views
        const reactionCount = post.reactions.length

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
  async getTrendingPosts(
    limit: number = 20,
    page: number = 1,
  ): Promise<{
    posts: Post[]
    total: number
    page: number
    limit: number
  }> {
    const skip = (page - 1) * limit

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where: {
          publicationStatus: 'PUBLISHED',
          deletedAt: null,
        },
        orderBy: [
          { trendingScore: 'desc' },
          { createdAt: 'desc' }, // Secondary sort by recency
        ],
        skip,
        take: limit,
        include: {
          author: { select: { id: true, name: true, email: true } },
          tags: { include: { tag: true } },
          reactions: true,
          comments: true,
        },
      }),
      this.prisma.post.count({
        where: {
          publicationStatus: 'PUBLISHED',
          deletedAt: null,
        },
      }),
    ])

    return {
      posts,
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
