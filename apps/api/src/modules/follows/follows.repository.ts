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
          },
        },
      },
    })
    return rows.map((r) => r.following)
  }

  countFollowers(followingId: string) {
    return this.prisma.follow.count({ where: { followingId } })
  }
}
