import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { nanoid } from 'nanoid'
import { PostStatus, PostType, UserRole, PostPublicationStatus } from '@/generated/prisma/client'
import { PaginationDto } from '@/common/dto/pagination.dto'
import { NotificationsService } from '../notifications/notifications.service'
import { FollowsService } from '../follows/follows.service'
import { TagsService } from '../tags/tags.service'
import { PrismaService } from '@/prisma/prisma.service'
import { PostsRepository } from './posts.repository'
import { CreatePostDto } from './dto/create-post.dto'
import { ListPostsDto } from './dto/list-posts.dto'
import { UpdatePostDto } from './dto/update-post.dto'
import { UpdatePostStatusDto } from './dto/update-post-status.dto'
import { ReactToPostDto } from './dto/react-to-post.dto'

@Injectable()
export class PostsService {
  constructor(
    private readonly postsRepository: PostsRepository,
    private readonly notificationsService: NotificationsService,
    private readonly followsService: FollowsService,
    private readonly tagsService: TagsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Helper method to filter for published posts only.
   * Used in all user-facing queries to ensure soft-deleted posts never appear.
   */
  private wherePublished() {
    return {
      publicationStatus: PostPublicationStatus.PUBLISHED,
    }
  }

  async create(dto: CreatePostDto, userId: string, departmentId?: string | null) {
    if (!departmentId) {
      throw new BadRequestException('Please set your department before creating a post')
    }

    const course = await this.postsRepository.findCourseDepartmentById(dto.courseId)
    if (!course) throw new NotFoundException('Course not found')

    if (course.departmentId !== departmentId) {
      throw new ForbiddenException('You can only create posts in your department')
    }

    // Extract tags and handle separately
    const { tags, ...postData } = dto

    const shortCode = nanoid(8)
    const post = await this.postsRepository.create(
      { shortCode, authorId: userId, ...postData },
      { id: userId },
    )

    // Add tags if provided
    if (tags && tags.length > 0) {
      await this.applyTags(post.id, tags)
    }

    if (post.status === PostStatus.APPROVED) {
      void this.followsService
        .getFollowerIds(userId)
        .then((followerIds) =>
          this.notificationsService.notifyFollowersNewPost(
            post.id,
            post.author?.name ?? 'Someone',
            post.title,
            followerIds,
          ),
        )
    }

    return post
  }

  async findAll(query: ListPostsDto, user?: { role?: UserRole; id?: string }) {
    const userRole = user?.role
    const userId = user?.id

    const isPrivileged = userRole === UserRole.MODERATOR || userRole === UserRole.ADMIN
    const canSeeAllStatuses = isPrivileged

    const {
      courseId,
      departmentId,
      yearLevel,
      moduleNumber,
      type,
      status,
      authorId,
      ...pagination
    } = query

    const courseWhere = {
      ...(departmentId && { departmentId }),
    }

    const isViewingOwnPosts = authorId != null && authorId === userId

    const where = {
      deletedAt: null,
      ...(courseId && { courseId }),
      ...(yearLevel != null && { year: yearLevel }),
      ...(moduleNumber != null && { moduleNumber }),
      ...(type && { type }),
      ...(Object.keys(courseWhere).length > 0 && { course: courseWhere }),
      ...(authorId && { authorId }),
      ...(authorId && !isPrivileged && !isViewingOwnPosts && { isAnonymous: false }),
      status: canSeeAllStatuses && status ? status : PostStatus.APPROVED,
    }

    return this.postsRepository.findAll(where, pagination, { id: userId, role: userRole })
  }

  async findOne(id: string, viewer?: { id?: string; role?: UserRole }) {
    const post = await this.postsRepository.findById(id, viewer)
    if (!post) throw new NotFoundException('Post not found')
    if (viewer?.id) void this.postsRepository.recordView(id, viewer.id)
    return post
  }

  async findByShortCode(shortCode: string, viewer?: { id?: string; role?: UserRole }) {
    const post = await this.postsRepository.findByShortCode(shortCode, viewer)
    if (!post) throw new NotFoundException('Post not found')
    return post
  }

  async assertCommentTargetExists(id: string) {
    const post = await this.postsRepository.findCommentTarget(id)
    if (!post) throw new NotFoundException('Post not found')
  }

  async getNotificationTarget(id: string) {
    const post = await this.postsRepository.findNotificationTarget(id)
    if (!post) throw new NotFoundException('Post not found')
    return post
  }

  async update(id: string, dto: UpdatePostDto, userId: string) {
    const post = await this.findOne(id, { id: userId })
    if (!post.isOwner) {
      throw new ForbiddenException('You do not own this post')
    }

    if (post.type === PostType.NOTE && dto.examYear !== undefined) {
      throw new BadRequestException('Exam year can only be updated for old question posts')
    }

    // Extract tags and handle separately
    const { tags, ...postData } = dto

    const updatedPost = await this.postsRepository.update(id, postData, { id: userId })

    // Update tags if provided
    if (tags) {
      await this.applyTags(id, tags)
    }

    return updatedPost
  }

  async remove(id: string, userId: string, userRole: UserRole) {
    const viewer = { id: userId, role: userRole }
    const post = await this.findOne(id, viewer)

    const isAdmin = userRole === UserRole.ADMIN
    if (!post.isOwner && !isAdmin) throw new ForbiddenException('You do not own this post')

    return this.postsRepository.softDelete(id)
  }

  async updateStatus(id: string, dto: UpdatePostStatusDto, viewer: { id: string; role: UserRole }) {
    const post = await this.findOne(id, viewer)
    if (!post.authorId) throw new NotFoundException('Post not found')

    const updated = await this.postsRepository.updateStatus(id, dto.status, viewer)
    void this.notificationsService.notifyPostStatus(id, post.authorId, dto.status, post.title)
    if (dto.status === PostStatus.APPROVED) {
      void this.followsService
        .getFollowerIds(post.authorId)
        .then((followerIds) =>
          this.notificationsService.notifyFollowersNewPost(
            id,
            post.author?.name ?? 'Someone',
            post.title,
            followerIds,
          ),
        )
    }
    return updated
  }

  savePost(postId: string, userId: string) {
    return this.postsRepository.savePost(postId, userId)
  }

  unsavePost(postId: string, userId: string) {
    return this.postsRepository.unsavePost(postId, userId)
  }

  getSavedPosts(userId: string, query: PaginationDto) {
    return this.postsRepository.findSaved({ id: userId }, query)
  }

  toggleReaction(id: string, dto: ReactToPostDto, userId: string, role?: UserRole) {
    return this.postsRepository.toggleReaction(id, { id: userId, role }, dto.type)
  }

  /**
   * Search posts by full-text search
   * Searches across title and description using PostgreSQL FTS
   */
  async searchPosts(
    query: string,
    limit: number = 20,
    page: number = 1,
  ): Promise<{
    results: any[]
    total: number
    page: number
    limit: number
  }> {
    if (!query || query.trim().length === 0) {
      return { results: [], total: 0, page, limit }
    }

    const searchQuery = query.trim()

    // Search using plainto_tsquery for safety and better results.
    // Column names must be quoted — Prisma stores them as camelCase in PostgreSQL.
    const results = (await this.prisma.$queryRaw`
      SELECT
        p.*,
        ts_rank(p."searchVector", plainto_tsquery('english', ${searchQuery})) as relevance
      FROM "post" p
      WHERE p."searchVector" @@ plainto_tsquery('english', ${searchQuery})
        AND p.status = ${'APPROVED'}
        AND p."publicationStatus" = ${'PUBLISHED'}
        AND p."deletedAt" IS NULL
      ORDER BY relevance DESC, p."createdAt" DESC
      LIMIT ${limit}
      OFFSET ${(page - 1) * limit}
    `) as any[]

    const totalResult = (await this.prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM "post" p
      WHERE p."searchVector" @@ plainto_tsquery('english', ${searchQuery})
        AND p.status = ${'APPROVED'}
        AND p."publicationStatus" = ${'PUBLISHED'}
        AND p."deletedAt" IS NULL
    `) as any[]

    const total = Number(totalResult[0]?.count ?? 0n)

    return {
      results: results.map((r) => {
        const { relevance, ...rest } = r
        return rest
      }),
      total: Number(total),
      page,
      limit,
    }
  }

  /**
   * Tag a post with multiple tags
   * Creates tags if they don't exist
   */
  async tagPost(
    postId: string,
    tagNames: string[],
    userId: string,
    userRole: UserRole,
  ): Promise<any> {
    const post = await this.postsRepository.findById(postId)
    if (!post) throw new NotFoundException('Post not found')
    if (
      post.authorId !== userId &&
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.MODERATOR
    ) {
      throw new ForbiddenException('Only the post author can modify tags')
    }
    return this.applyTags(postId, tagNames)
  }

  private async applyTags(postId: string, tagNames: string[]): Promise<any> {
    const tags = await Promise.all(tagNames.map((name) => this.tagsService.findOrCreate(name)))

    // Use transaction to delete old tags and create new ones
    await this.prisma.$transaction(async (tx) => {
      // Delete existing post tags
      await tx.postTag.deleteMany({
        where: { postId },
      })

      // Create new post tags
      await tx.postTag.createMany({
        data: tags.map((tag) => ({
          postId,
          tagId: tag.id,
        })),
      })
    })

    // Return post with tags
    const updatedPost = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    })

    return updatedPost
  }

  /**
   * Remove a tag from a post
   */
  async untagPost(
    postId: string,
    tagId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<void> {
    const post = await this.postsRepository.findById(postId)
    if (!post) throw new NotFoundException('Post not found')
    if (
      post.authorId !== userId &&
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.MODERATOR
    ) {
      throw new ForbiddenException('Only the post author can remove tags')
    }

    const postTag = await this.prisma.postTag.findUnique({
      where: {
        postId_tagId: {
          postId,
          tagId,
        },
      },
    })

    if (!postTag) {
      throw new BadRequestException('Tag not associated with this post')
    }

    await this.prisma.postTag.delete({
      where: {
        postId_tagId: {
          postId,
          tagId,
        },
      },
    })
  }

  /**
   * Find posts with a specific tag
   */
  async findPostsByTag(
    tagSlug: string,
    limit: number = 20,
    page: number = 1,
  ): Promise<{ results: any[]; total: number }> {
    const results = await this.prisma.post.findMany({
      where: {
        tags: {
          some: {
            tag: {
              slug: tagSlug,
            },
          },
        },
        ...this.wherePublished(),
        status: PostStatus.APPROVED,
        deletedAt: null,
      },
      take: limit,
      skip: (page - 1) * limit,
    })

    const total = await this.prisma.post.count({
      where: {
        tags: {
          some: {
            tag: {
              slug: tagSlug,
            },
          },
        },
        ...this.wherePublished(),
        status: PostStatus.APPROVED,
        deletedAt: null,
      },
    })

    return {
      results,
      total,
    }
  }

  /**
   * Find posts that have all specified tags
   */
  async findPostsByMultipleTags(
    tagSlugs: string[],
    limit: number = 20,
    page: number = 1,
  ): Promise<any[]> {
    if (tagSlugs.length === 0) {
      return []
    }

    // Get posts that have all specified tags
    const posts = await this.prisma.post.findMany({
      where: {
        AND: tagSlugs.map((slug) => ({
          tags: {
            some: {
              tag: {
                slug,
              },
            },
          },
        })),
        ...this.wherePublished(),
        status: PostStatus.APPROVED,
        deletedAt: null,
      },
      take: limit,
      skip: (page - 1) * limit,
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    })

    return posts
  }
}
