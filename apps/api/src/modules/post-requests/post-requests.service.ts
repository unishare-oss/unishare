import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { PostRequestsRepository } from './post-requests.repository'
import { CreatePostRequestDto } from './dto/create-post-request.dto'
import { ListPostRequestsDto } from './dto/list-post-requests.dto'
import { CreateFulfillmentSuggestionDto } from './dto/create-fulfillment-suggestion.dto'
import { NotificationsService } from '../notifications/notifications.service'
import { UniversityScope } from '@/common/university-scope'

@Injectable()
export class PostRequestsService {
  constructor(
    private readonly postRequestsRepository: PostRequestsRepository,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Another university's course is a 404, so nobody can open requests on it.
  async create(dto: CreatePostRequestDto, authorId: string, scope: UniversityScope) {
    const course = await this.postRequestsRepository.findCourseIdInScope(dto.courseId, scope)
    if (!course) throw new NotFoundException('Course not found')
    return this.postRequestsRepository.create({ ...dto, authorId })
  }

  findAll(query: ListPostRequestsDto, scope: UniversityScope, userId?: string) {
    const { courseId, departmentId, status, ...pagination } = query
    const where = {
      ...(courseId && { courseId }),
      ...(status && { status }),
      ...(departmentId && { course: { departmentId } }),
    }
    return this.postRequestsRepository.findAll(where, scope, pagination, userId)
  }

  // Every route by id goes through this first, so another university's request is a 404, and
  // that comes before any ownership check.
  async findOne(id: string, scope: UniversityScope, userId?: string) {
    const r = await this.postRequestsRepository.findById(id, scope, userId)
    if (!r) throw new NotFoundException('Post request not found')
    return r
  }

  async toggleUpvote(id: string, userId: string, scope: UniversityScope) {
    await this.findOne(id, scope, userId)
    return this.postRequestsRepository.toggleUpvote(id, userId, scope)
  }

  async suggest(
    requestId: string,
    dto: CreateFulfillmentSuggestionDto,
    userId: string,
    scope: UniversityScope,
  ) {
    const request = await this.findOne(requestId, scope, userId)
    // A post the requester can't read can't be offered as the answer either.
    const post = await this.postRequestsRepository.findPostIdInScope(dto.postId, scope)
    if (!post) throw new NotFoundException('Post not found')
    if (request.status === 'FULFILLED') {
      throw new BadRequestException('This request is already fulfilled')
    }
    const existing = await this.postRequestsRepository.findSuggestionByUser(requestId, userId)
    if (existing) {
      throw new BadRequestException('You have already suggested a fulfillment for this request')
    }
    const suggestion = await this.postRequestsRepository.createSuggestion(
      requestId,
      dto.postId,
      userId,
    )
    void this.notificationsService.notifyRequestSuggestion(
      requestId,
      request.author!.id,
      userId,
      undefined,
      request.title,
    )
    return suggestion
  }

  async removeSuggestion(
    requestId: string,
    suggestionId: string,
    userId: string,
    scope: UniversityScope,
  ) {
    await this.findOne(requestId, scope, userId)
    const suggestion = await this.postRequestsRepository.findSuggestion(suggestionId)
    if (!suggestion || suggestion.requestId !== requestId) {
      throw new NotFoundException('Suggestion not found')
    }
    if (suggestion.userId !== userId) {
      throw new ForbiddenException('You can only remove your own suggestions')
    }
    return this.postRequestsRepository.deleteSuggestion(suggestionId)
  }

  async acceptSuggestion(
    requestId: string,
    suggestionId: string,
    userId: string,
    scope: UniversityScope,
  ) {
    const request = await this.findOne(requestId, scope, userId)
    if (request.author?.id !== userId) {
      throw new ForbiddenException('Only the request author can accept a suggestion')
    }
    if (request.status === 'FULFILLED') {
      throw new BadRequestException('This request is already fulfilled')
    }
    const suggestion = await this.postRequestsRepository.findSuggestion(suggestionId)
    if (!suggestion || suggestion.requestId !== requestId) {
      throw new NotFoundException('Suggestion not found')
    }
    const result = await this.postRequestsRepository.acceptSuggestion(
      requestId,
      suggestion.postId,
      userId,
    )
    void this.notificationsService.notifyRequestFulfilled(
      requestId,
      suggestion.userId,
      userId,
      request.title,
    )
    return result
  }

  async remove(id: string, userId: string, scope: UniversityScope) {
    const r = await this.findOne(id, scope, userId)
    if (r.author?.id !== userId) {
      throw new ForbiddenException('Only the author can delete this request')
    }
    return this.postRequestsRepository.delete(id)
  }
}
