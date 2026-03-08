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
    return this.postsRepository.create({ shortCode, authorId: userId, ...dto })
  }

  async findAll(query: ListPostsDto, user?: { role?: UserRole; id?: string }) {
    const userRole = user?.role
    const userId = user?.id

    //Role
    const canSeeAllStatuses = userRole === UserRole.MODERATOR || userRole === UserRole.ADMIN

    const { courseId, departmentId, type, status, authorId, ...pagination } = query

    const where = {
      deletedAt: null,
      ...(courseId && { courseId }),
      ...(type && { type }),
      ...(departmentId && { course: { departmentId } }),
      ...(authorId && { authorId }),
      status: canSeeAllStatuses && status ? status : PostStatus.APPROVED,
    }

    return this.postsRepository.findAll(where, pagination, userId)
  }

  async findOne(id: string, userId?: string) {
    const post = await this.postsRepository.findById(id, userId)
    if (!post) throw new NotFoundException('Post not found')
    if (userId) void this.postsRepository.recordView(id, userId)
    return post
  }

  async findByShortCode(shortCode: string, userId?: string) {
    const post = await this.postsRepository.findByShortCode(shortCode, userId)
    if (!post) throw new NotFoundException('Post not found')
    return post
  }

  async assertCommentTargetExists(id: string) {
    const post = await this.postsRepository.findCommentTarget(id)
    if (!post) throw new NotFoundException('Post not found')
  }

  async update(id: string, dto: UpdatePostDto, userId: string) {
    const post = await this.findOne(id)
    if (post.authorId !== userId) throw new ForbiddenException('You do not own this post')

    if (post.type === PostType.NOTE && dto.examYear !== undefined) {
      throw new BadRequestException('Exam year can only be updated for old question posts')
    }

    return this.postsRepository.update(id, dto)
  }

  async remove(id: string, userId: string, userRole: UserRole) {
    const post = await this.findOne(id)
    const isOwner = post.authorId === userId
    const isAdmin = userRole === UserRole.ADMIN
    if (!isOwner && !isAdmin) throw new ForbiddenException('You do not own this post')
    return this.postsRepository.softDelete(id)
  }

  async updateStatus(id: string, dto: UpdatePostStatusDto) {
    const post = await this.findOne(id)
    const updated = await this.postsRepository.updateStatus(id, dto.status)
    void this.notificationsService.notifyPostStatus(id, post.authorId, dto.status, post.title)
    return updated
  }

  savePost(postId: string, userId: string) {
    return this.postsRepository.savePost(postId, userId)
  }

  unsavePost(postId: string, userId: string) {
    return this.postsRepository.unsavePost(postId, userId)
  }

  getSavedPosts(userId: string, query: PaginationDto) {
    return this.postsRepository.findSaved(userId, query)
  }

  toggleReaction(id: string, dto: ReactToPostDto, userId: string) {
    return this.postsRepository.toggleReaction(id, userId, dto.type)
  }
}
