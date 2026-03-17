import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common'
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { OptionalAuth, Session } from '@thallesp/nestjs-better-auth'
import { UserSession } from '@/auth/auth.config'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { PostRequestsService } from './post-requests.service'
import { CreatePostRequestDto } from './dto/create-post-request.dto'
import { ListPostRequestsDto } from './dto/list-post-requests.dto'
import { CreateFulfillmentSuggestionDto } from './dto/create-fulfillment-suggestion.dto'
import {
  PostRequestEntity,
  PostRequestDetailEntity,
  PostRequestFulfillmentEntity,
  PaginatedPostRequestEntity,
} from './entities/post-request.entity'

@ApiTags('post-requests')
@Controller('post-requests')
export class PostRequestsController {
  constructor(private readonly postRequestsService: PostRequestsService) {}

  @Post()
  @ApiCreatedResponse({ type: PostRequestEntity })
  @ResponseMessage('Request created successfully')
  create(@Body() dto: CreatePostRequestDto, @Session() session: UserSession) {
    return this.postRequestsService.create(dto, session.user.id)
  }

  @Get()
  @OptionalAuth()
  @ApiOkResponse({ type: PaginatedPostRequestEntity })
  @ResponseMessage('Requests fetched successfully')
  findAll(@Query() query: ListPostRequestsDto, @Session() session: UserSession) {
    return this.postRequestsService.findAll(query, session?.user?.id)
  }

  @Get(':id')
  @OptionalAuth()
  @ApiOkResponse({ type: PostRequestDetailEntity })
  @ResponseMessage('Request fetched successfully')
  findOne(@Param('id') id: string, @Session() session: UserSession) {
    return this.postRequestsService.findOne(id, session?.user?.id)
  }

  @Post(':id/upvote')
  @ApiOkResponse({ type: PostRequestDetailEntity })
  @ResponseMessage('Upvote toggled')
  upvote(@Param('id') id: string, @Session() session: UserSession) {
    return this.postRequestsService.toggleUpvote(id, session.user.id)
  }

  @Post(':id/suggestions')
  @ApiCreatedResponse({ type: PostRequestFulfillmentEntity })
  @ResponseMessage('Suggestion submitted')
  suggest(
    @Param('id') id: string,
    @Body() dto: CreateFulfillmentSuggestionDto,
    @Session() session: UserSession,
  ) {
    return this.postRequestsService.suggest(id, dto, session.user.id)
  }

  @Delete(':id/suggestions/:suggestionId')
  @ResponseMessage('Suggestion removed')
  removeSuggestion(
    @Param('id') id: string,
    @Param('suggestionId') suggestionId: string,
    @Session() session: UserSession,
  ) {
    return this.postRequestsService.removeSuggestion(id, suggestionId, session.user.id)
  }

  @Post(':id/suggestions/:suggestionId/accept')
  @ApiOkResponse({ type: PostRequestDetailEntity })
  @ResponseMessage('Request marked as fulfilled')
  acceptSuggestion(
    @Param('id') id: string,
    @Param('suggestionId') suggestionId: string,
    @Session() session: UserSession,
  ) {
    return this.postRequestsService.acceptSuggestion(id, suggestionId, session.user.id)
  }

  @Delete(':id')
  @ResponseMessage('Request deleted successfully')
  remove(@Param('id') id: string, @Session() session: UserSession) {
    return this.postRequestsService.remove(id, session.user.id)
  }
}
