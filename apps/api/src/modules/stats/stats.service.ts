import { Injectable } from '@nestjs/common'
import { UniversityScope } from '@/common/university-scope'
import { StatsRepository } from './stats.repository'

@Injectable()
export class StatsService {
  constructor(private readonly statsRepository: StatsRepository) {}

  // Counted within the requester's university; admins (scope `all`) get platform-wide counts.
  async getStats(scope: UniversityScope) {
    const [
      totalUsers,
      totalPosts,
      totalComments,
      totalReactions,
      topPostsByViews,
      topPostsByReactions,
      topUsers,
    ] = await Promise.all([
      this.statsRepository.countUsers(scope),
      this.statsRepository.countPosts(scope),
      this.statsRepository.countComments(scope),
      this.statsRepository.countReactions(scope),
      this.statsRepository.findTopPostsByViews(scope),
      this.statsRepository.findTopPostsByReactions(scope),
      this.statsRepository.findTopUsersByPostCount(scope),
    ])

    return {
      overview: { totalUsers, totalPosts, totalComments, totalReactions },
      topPostsByViews: topPostsByViews.map((p) => ({
        id: p.id,
        title: p.title ?? '(Untitled)',
        shortCode: p.shortCode,
        views: p.views,
        reactionCount: p._count.reactions,
        authorName: p.isAnonymous ? null : p.author.name,
      })),
      topPostsByReactions: topPostsByReactions.map((p) => ({
        id: p.id,
        title: p.title ?? '(Untitled)',
        shortCode: p.shortCode,
        views: p.views,
        reactionCount: p._count.reactions,
        authorName: p.isAnonymous ? null : p.author.name,
      })),
      topUsers: topUsers.map((u) => ({
        id: u.id,
        name: u.name,
        image: u.image,
        postCount: Number(u.postCount),
        departmentName: u.departmentName,
      })),
    }
  }
}
