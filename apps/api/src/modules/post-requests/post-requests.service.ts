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

@Injectable()
export class PostRequestsService {
  constructor(private readonly repo: PostRequestsRepository) {}

  create(dto: CreatePostRequestDto, authorId: string) {
    return this.repo.create({ ...dto, authorId })
  }

  findAll(query: ListPostRequestsDto, userId?: string) {
    const { courseId, departmentId, status, ...pagination } = query
    const where = {
      ...(courseId && { courseId }),
      ...(status && { status }),
      ...(departmentId && { course: { departmentId } }),
    }
    return this.repo.findAll(where, pagination, userId)
  }

  async findOne(id: string, userId?: string) {
    const r = await this.repo.findById(id, userId)
    if (!r) throw new NotFoundException('Post request not found')
    return r
  }

  toggleUpvote(id: string, userId: string) {
    return this.repo.toggleUpvote(id, userId)
  }

  async suggest(requestId: string, dto: CreateFulfillmentSuggestionDto, userId: string) {
    const request = await this.findOne(requestId, userId)
    if (request.status === 'FULFILLED') {
      throw new BadRequestException('This request is already fulfilled')
    }
    const existing = await this.repo.findSuggestionByUser(requestId, userId)
    if (existing) {
      throw new BadRequestException('You have already suggested a fulfillment for this request')
    }
    return this.repo.createSuggestion(requestId, dto.postId, userId)
  }

  async removeSuggestion(requestId: string, suggestionId: string, userId: string) {
    const suggestion = await this.repo.findSuggestion(suggestionId)
    if (!suggestion) throw new NotFoundException('Suggestion not found')
    if (suggestion.userId !== userId) {
      throw new ForbiddenException('You can only remove your own suggestions')
    }
    return this.repo.deleteSuggestion(suggestionId)
  }

  async acceptSuggestion(requestId: string, suggestionId: string, userId: string) {
    const request = await this.findOne(requestId, userId)
    if (request.author?.id !== userId) {
      throw new ForbiddenException('Only the request author can accept a suggestion')
    }
    if (request.status === 'FULFILLED') {
      throw new BadRequestException('This request is already fulfilled')
    }
    const suggestion = await this.repo.findSuggestion(suggestionId)
    if (!suggestion || suggestion.requestId !== requestId) {
      throw new NotFoundException('Suggestion not found')
    }
    return this.repo.acceptSuggestion(requestId, suggestion.postId, userId)
  }

  async remove(id: string, userId: string) {
    const r = await this.findOne(id, userId)
    if (r.author?.id !== userId) {
      throw new ForbiddenException('Only the author can delete this request')
    }
    return this.repo.delete(id)
  }
}
