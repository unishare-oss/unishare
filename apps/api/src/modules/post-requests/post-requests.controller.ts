import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { OptionalAuth, Session } from '@thallesp/nestjs-better-auth'
import { UserSession } from '@/auth/auth.config'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { PostRequestsService } from './post-requests.service'
import { CreatePostRequestDto } from './dto/create-post-request.dto'
import { ListPostRequestsDto } from './dto/list-post-requests.dto'
import { FulfillPostRequestDto } from './dto/fulfill-post-request.dto'
import { PostRequestEntity, PaginatedPostRequestEntity } from './entities/post-request.entity'

@ApiTags('post-requests')
@Controller('post-requests')
export class PostRequestsController {
  constructor(private readonly service: PostRequestsService) {}

  @Post()
  @ApiCreatedResponse({ type: PostRequestEntity })
  @ResponseMessage('Request created successfully')
  create(@Body() dto: CreatePostRequestDto, @Session() session: UserSession) {
    return this.service.create(dto, session.user.id)
  }

  @Get()
  @OptionalAuth()
  @ApiOkResponse({ type: PaginatedPostRequestEntity })
  @ResponseMessage('Requests fetched successfully')
  findAll(@Query() query: ListPostRequestsDto, @Session() session: UserSession) {
    return this.service.findAll(query, session?.user?.id)
  }

  @Get(':id')
  @OptionalAuth()
  @ApiOkResponse({ type: PostRequestEntity })
  @ResponseMessage('Request fetched successfully')
  findOne(@Param('id') id: string, @Session() session: UserSession) {
    return this.service.findOne(id, session?.user?.id)
  }

  @Post(':id/upvote')
  @ApiOkResponse({ type: PostRequestEntity })
  @ResponseMessage('Upvote toggled')
  upvote(@Param('id') id: string, @Session() session: UserSession) {
    return this.service.toggleUpvote(id, session.user.id)
  }

  @Patch(':id/fulfill')
  @ApiOkResponse({ type: PostRequestEntity })
  @ResponseMessage('Request marked as fulfilled')
  fulfill(
    @Param('id') id: string,
    @Body() dto: FulfillPostRequestDto,
    @Session() session: UserSession,
  ) {
    return this.service.fulfill(id, dto, session.user.id)
  }

  @Delete(':id')
  @ResponseMessage('Request deleted successfully')
  remove(@Param('id') id: string, @Session() session: UserSession) {
    return this.service.remove(id, session.user.id)
  }
}
