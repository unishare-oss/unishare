import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'

@Injectable()
export class FollowsRepository {
  constructor(private readonly prisma: PrismaService) {}

  follow(followerId: string, followingId: string) {
    return this.prisma.follow.upsert({
      where: { followerId_followingId: { followerId, followingId } },
      create: { followerId, followingId },
      update: {},
    })
  }

  unfollow(followerId: string, followingId: string) {
    return this.prisma.follow.deleteMany({ where: { followerId, followingId } })
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const record = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
      select: { followerId: true },
    })
    return record !== null
  }

  async getFollowers(followingId: string) {
    const rows = await this.prisma.follow.findMany({
      where: { followingId },
      include: {
        follower: {
          select: {
            id: true,
            name: true,
            image: true,
            publicKey: true,
          },
        },
      },
    })
    return rows.map((r) => r.follower)
  }

  async getFollowing(followerId: string) {
    const rows = await this.prisma.follow.findMany({
      where: { followerId },
      include: {
        following: {
          select: {
            id: true,
            name: true,
            image: true,
            publicKey: true,
          },
        },
      },
    })
    return rows.map((r) => r.following)
  }

  findMentionable(userId: string, q: string, take = 8) {
    return this.prisma.user.findMany({
      where: {
        id: { not: userId },
        name: { startsWith: q, mode: 'insensitive' },
        OR: [
          { following: { some: { followingId: userId } } },
          { followers: { some: { followerId: userId } } },
        ],
      },
      select: { id: true, name: true, image: true },
      orderBy: { name: 'asc' },
      take,
    })
  }

  async filterConnected(userId: string, ids: string[]): Promise<string[]> {
    if (ids.length === 0) return []
    const rows = await this.prisma.follow.findMany({
      where: {
        OR: [
          { followerId: userId, followingId: { in: ids } },
          { followingId: userId, followerId: { in: ids } },
        ],
      },
      select: { followerId: true, followingId: true },
    })
    const connected = new Set(
      rows.map((r) => (r.followerId === userId ? r.followingId : r.followerId)),
    )
    return ids.filter((id) => connected.has(id))
  }

  countFollowers(followingId: string) {
    return this.prisma.follow.count({ where: { followingId } })
  }

  countFollowing(followerId: string) {
    return this.prisma.follow.count({ where: { followerId } })
  }
}
