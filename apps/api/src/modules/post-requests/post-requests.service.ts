import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PostRequestsRepository } from './post-requests.repository'
import { CreatePostRequestDto } from './dto/create-post-request.dto'
import { ListPostRequestsDto } from './dto/list-post-requests.dto'
import { FulfillPostRequestDto } from './dto/fulfill-post-request.dto'

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

  async fulfill(id: string, dto: FulfillPostRequestDto, userId: string) {
    const r = await this.findOne(id, userId)
    if (r.authorId !== userId) {
      throw new ForbiddenException('Only the author can mark this request as fulfilled')
    }
    return this.repo.fulfill(id, dto.postId, userId)
  }

  async remove(id: string, userId: string) {
    const r = await this.findOne(id, userId)
    if (r.authorId !== userId) {
      throw new ForbiddenException('Only the author can delete this request')
    }
    return this.repo.delete(id)
  }
}
