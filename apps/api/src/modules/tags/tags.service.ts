import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import type { Tag } from '@/generated/prisma/client'

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate slug from tag name
   * Lowercase, trim, replace spaces with hyphens, remove non-alphanumeric chars
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/&/g, 'and')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-{2,}/g, '-')
  }

  /**
   * Find or create a tag by name
   * Uses slug as unique identifier to prevent duplicates
   */
  async findOrCreate(name: string, color?: string): Promise<Tag> {
    const slug = this.generateSlug(name)

    const tag = await this.prisma.tag.upsert({
      where: { slug },
      update: {},
      create: {
        name: name.trim(),
        slug,
        color: color || '#3B82F6',
      },
    })

    return tag
  }

  /**
   * Find tag by slug
   */
  async findBySlug(slug: string): Promise<Tag | null> {
    const tag = await this.prisma.tag.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { posts: true },
        },
      },
    })

    return tag as any
  }

  /**
   * Get tag suggestions (autocomplete) matching query
   * Returns tags where name starts with query (case-insensitive)
   * Ordered by post count (trending tags first)
   */
  async autocomplete(query: string, limit: number = 10): Promise<any[]> {
    const tags = await this.prisma.tag.findMany({
      where: {
        name: {
          startsWith: query,
          mode: 'insensitive',
        },
      },
      include: {
        _count: {
          select: { posts: true },
        },
      },
      orderBy: {
        posts: {
          _count: 'desc',
        },
      },
      take: limit,
    })

    return tags.map((tag) => ({
      ...tag,
      postCount: tag._count.posts,
    }))
  }

  /**
   * Get trending tags ordered by post count
   */
  async getTrendingTags(limit: number = 10): Promise<any[]> {
    const tags = await this.prisma.tag.findMany({
      include: {
        _count: {
          select: { posts: true },
        },
      },
      orderBy: {
        posts: {
          _count: 'desc',
        },
      },
      take: limit,
    })

    return tags.map((tag) => ({
      ...tag,
      postCount: tag._count.posts,
    }))
  }

  /**
   * Get tag statistics
   */
  async getTagStats(): Promise<{
    total: number
    mostUsed: any[]
    recentlyAdded: any[]
  }> {
    const total = await this.prisma.tag.count()

    const mostUsed = await this.prisma.tag.findMany({
      include: {
        _count: {
          select: { posts: true },
        },
      },
      orderBy: {
        posts: {
          _count: 'desc',
        },
      },
      take: 5,
    })

    const recentlyAdded = await this.prisma.tag.findMany({
      include: {
        _count: {
          select: { posts: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    })

    return {
      total,
      mostUsed: mostUsed.map((tag) => ({
        ...tag,
        postCount: tag._count.posts,
      })),
      recentlyAdded: recentlyAdded.map((tag) => ({
        ...tag,
        postCount: tag._count.posts,
      })),
    }
  }

  /**
   * Validate tag name
   */
  validateTag(name: string): boolean {
    const regex = /^[a-z0-9\s\-&()]{2,50}$/i
    return regex.test(name) && name.length >= 2 && name.length <= 50
  }
}
