import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { nanoid } from 'nanoid'
import { PostStatus, PostType, UserRole } from '@/generated/prisma/client'
import { PaginationDto } from '@/common/dto/pagination.dto'
import { NotificationsService } from '../notifications/notifications.service'
import { FollowsService } from '../follows/follows.service'
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
  ) {}

  async create(dto: CreatePostDto, userId: string, departmentId?: string | null) {
    if (!departmentId) {
      throw new BadRequestException('Please set your department before creating a post')
    }

    const course = await this.postsRepository.findCourseDepartmentById(dto.courseId)
    if (!course) throw new NotFoundException('Course not found')

    if (course.departmentId !== departmentId) {
      throw new ForbiddenException('You can only create posts in your department')
    }

    const shortCode = nanoid(8)
    const post = await this.postsRepository.create(
      { shortCode, authorId: userId, ...dto },
      { id: userId },
    )

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

    const { courseId, departmentId, yearLevel, type, status, authorId, ...pagination } = query

    const courseWhere = {
      ...(departmentId && { departmentId }),
    }

    const isViewingOwnPosts = authorId != null && authorId === userId

    const where = {
      deletedAt: null,
      ...(courseId && { courseId }),
      ...(yearLevel != null && { year: yearLevel }),
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

    return this.postsRepository.update(id, dto, { id: userId })
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
}
