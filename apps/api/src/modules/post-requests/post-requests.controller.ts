import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common'
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Session } from '@thallesp/nestjs-better-auth'
import { UserSession } from '@/auth/auth.config'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { GuestReadOnly } from '@/common/decorators/guest-read-only.decorator'
import { UniversityScopeParam } from '@/common/decorators/university-scope.decorator'
import type { UniversityScope } from '@/common/university-scope'
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
@GuestReadOnly()
@Controller('post-requests')
export class PostRequestsController {
  constructor(private readonly postRequestsService: PostRequestsService) {}

  @Post()
  @ApiCreatedResponse({ type: PostRequestEntity })
  @ResponseMessage('Request created successfully')
  create(
    @Body() dto: CreatePostRequestDto,
    @Session() session: UserSession,
    @UniversityScopeParam() scope: UniversityScope,
  ) {
    return this.postRequestsService.create(dto, session.user.id, scope)
  }

  @Get()
  @ApiOkResponse({ type: PaginatedPostRequestEntity })
  @ResponseMessage('Requests fetched successfully')
  findAll(
    @Query() query: ListPostRequestsDto,
    @Session() session: UserSession,
    @UniversityScopeParam() scope: UniversityScope,
  ) {
    return this.postRequestsService.findAll(query, scope, session?.user?.id)
  }

  @Get(':id')
  @ApiOkResponse({ type: PostRequestDetailEntity })
  @ResponseMessage('Request fetched successfully')
  findOne(
    @Param('id') id: string,
    @Session() session: UserSession,
    @UniversityScopeParam() scope: UniversityScope,
  ) {
    return this.postRequestsService.findOne(id, scope, session?.user?.id)
  }

  @Post(':id/upvote')
  @ApiOkResponse({ type: PostRequestDetailEntity })
  @ResponseMessage('Upvote toggled')
  upvote(
    @Param('id') id: string,
    @Session() session: UserSession,
    @UniversityScopeParam() scope: UniversityScope,
  ) {
    return this.postRequestsService.toggleUpvote(id, session.user.id, scope)
  }

  @Post(':id/suggestions')
  @ApiCreatedResponse({ type: PostRequestFulfillmentEntity })
  @ResponseMessage('Suggestion submitted')
  suggest(
    @Param('id') id: string,
    @Body() dto: CreateFulfillmentSuggestionDto,
    @Session() session: UserSession,
    @UniversityScopeParam() scope: UniversityScope,
  ) {
    return this.postRequestsService.suggest(id, dto, session.user.id, scope)
  }

  @Delete(':id/suggestions/:suggestionId')
  @ResponseMessage('Suggestion removed')
  removeSuggestion(
    @Param('id') id: string,
    @Param('suggestionId') suggestionId: string,
    @Session() session: UserSession,
    @UniversityScopeParam() scope: UniversityScope,
  ) {
    return this.postRequestsService.removeSuggestion(id, suggestionId, session.user.id, scope)
  }

  @Post(':id/suggestions/:suggestionId/accept')
  @ApiOkResponse({ type: PostRequestDetailEntity })
  @ResponseMessage('Request marked as fulfilled')
  acceptSuggestion(
    @Param('id') id: string,
    @Param('suggestionId') suggestionId: string,
    @Session() session: UserSession,
    @UniversityScopeParam() scope: UniversityScope,
  ) {
    return this.postRequestsService.acceptSuggestion(id, suggestionId, session.user.id, scope)
  }

  @Delete(':id')
  @ResponseMessage('Request deleted successfully')
  remove(
    @Param('id') id: string,
    @Session() session: UserSession,
    @UniversityScopeParam() scope: UniversityScope,
  ) {
    return this.postRequestsService.remove(id, session.user.id, scope)
  }
}
