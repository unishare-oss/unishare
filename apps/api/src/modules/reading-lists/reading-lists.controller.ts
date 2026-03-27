import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common'
import { ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { OptionalAuth, Session } from '@thallesp/nestjs-better-auth'
import { UserSession } from '@/auth/auth.config'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { PaginationDto } from '@/common/dto/pagination.dto'
import { ReadingListsService } from './reading-lists.service'
import { CreateReadingListDto } from './dto/create-reading-list.dto'
import { UpdateReadingListDto } from './dto/update-reading-list.dto'
import { ReadingListEntity } from './entities/reading-list.entity'
import { PostsService } from '../posts/posts.service'
import { UserRole } from '@/generated/prisma/enums'

@ApiTags('reading-lists')
@Controller('reading-lists')
export class ReadingListsController {
  constructor(
    private readonly readingListsService: ReadingListsService,
    private readonly postsService: PostsService,
  ) {}

  @Post()
  @ApiOkResponse({ type: ReadingListEntity })
  @ResponseMessage('Reading list created')
  create(@Body() dto: CreateReadingListDto, @Session() session: UserSession) {
    return this.readingListsService.create(session.user.id, dto)
  }

  @Get()
  @ApiOkResponse({ type: [ReadingListEntity] })
  @ResponseMessage('Reading lists fetched')
  findAll(@Session() session: UserSession) {
    return this.readingListsService.findAllForUser(session.user.id)
  }

  @Get(':id')
  @OptionalAuth()
  @ApiOkResponse({ type: ReadingListEntity })
  @ResponseMessage('Reading list fetched')
  findOne(@Param('id') id: string, @Session() session: UserSession) {
    return this.readingListsService.findOne(id, session?.user?.id)
  }

  @Get(':id/posts')
  @OptionalAuth()
  @ResponseMessage('Reading list posts fetched')
  async getListPosts(
    @Param('id') id: string,
    @Query() query: PaginationDto,
    @Session() session: UserSession,
  ) {
    await this.readingListsService.findOne(id, session?.user?.id) // access check
    return this.postsService.getReadingListPosts(id, query, {
      id: session?.user?.id,
      role: session?.user?.role as UserRole,
    })
  }

  @Put(':id')
  @ApiOkResponse({ type: ReadingListEntity })
  @ResponseMessage('Reading list updated')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateReadingListDto,
    @Session() session: UserSession,
  ) {
    return this.readingListsService.update(id, session.user.id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  remove(@Param('id') id: string, @Session() session: UserSession) {
    return this.readingListsService.remove(id, session.user.id)
  }

  @Post(':id/posts/:postId')
  @ApiOkResponse({ type: ReadingListEntity })
  @ResponseMessage('Post added to reading list')
  addPost(
    @Param('id') id: string,
    @Param('postId') postId: string,
    @Session() session: UserSession,
  ) {
    return this.readingListsService.addPost(id, postId, session.user.id)
  }

  @Delete(':id/posts/:postId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  removePost(
    @Param('id') id: string,
    @Param('postId') postId: string,
    @Session() session: UserSession,
  ) {
    return this.readingListsService.removePost(id, postId, session.user.id)
  }
}
