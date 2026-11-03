import { Injectable } from '@nestjs/common'
import type { UniversityScope } from '@/common/university-scope'
import { FeedbackRepository } from './feedback.repository'
import { CreateFeedbackDto } from './dto/create-feedback.dto'
import { ListFeedbackDto } from './dto/list-feedback.dto'

@Injectable()
export class FeedbackService {
  constructor(private readonly feedbackRepository: FeedbackRepository) {}

  async create(dto: CreateFeedbackDto, userId?: string) {
    return this.feedbackRepository.create({
      type: dto.type,
      message: dto.message,
      userId,
    })
  }

  /** Admins read every university's feedback; a moderator reads their own university's. */
  async findAll(filters: ListFeedbackDto, scope: UniversityScope) {
    return this.feedbackRepository.findAll(
      { type: filters.type, page: filters.page ?? 1, limit: filters.limit ?? 20 },
      scope,
    )
  }
}
