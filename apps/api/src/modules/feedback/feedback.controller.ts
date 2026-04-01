import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import { ApiCreatedResponse, ApiForbiddenResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { OptionalAuth, Roles, Session } from '@thallesp/nestjs-better-auth'
import { UserSession } from '@/auth/auth.config'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { FeedbackService } from './feedback.service'
import { CreateFeedbackDto } from './dto/create-feedback.dto'
import { ListFeedbackDto } from './dto/list-feedback.dto'
import { FeedbackEntity, PaginatedFeedbackEntity } from './entities/feedback.entity'

@ApiTags('feedback')
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @OptionalAuth()
  @ApiCreatedResponse({ type: FeedbackEntity })
  @ResponseMessage('Feedback submitted')
  async create(@Body() dto: CreateFeedbackDto, @Session() session: UserSession) {
    return this.feedbackService.create(dto, session?.user?.id)
  }
}

@ApiTags('admin')
@Controller('admin/feedback')
export class AdminFeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Get()
  @Roles(['ADMIN', 'MODERATOR'])
  @ApiOkResponse({ type: PaginatedFeedbackEntity })
  @ApiForbiddenResponse({ description: 'Admin or moderator role required' })
  @ResponseMessage('Feedback fetched')
  async findAll(@Query() filters: ListFeedbackDto) {
    return this.feedbackService.findAll(filters)
  }
}
