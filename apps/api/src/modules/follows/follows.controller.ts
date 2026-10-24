import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common'
import { ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Session } from '@thallesp/nestjs-better-auth'
import { UserSession } from '@/auth/auth.config'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { FollowsService } from './follows.service'
import { MentionableQueryDto } from './dto/mentionable-query.dto'
import { MentionableUserEntity } from './entities/mentionable-user.entity'
import { FollowUserEntity } from './entities/follow-user.entity'

@ApiTags('follows')
@Controller('users')
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  @Get('me/mentionable')
  @ApiOkResponse({ type: [MentionableUserEntity] })
  @ResponseMessage('Mentionable users fetched successfully')
  getMentionable(@Query() dto: MentionableQueryDto, @Session() session: UserSession) {
    return this.followsService.getMentionable(session.user.id, dto.q)
  }

  @Post(':id/follow')
  @ApiOkResponse()
  @ResponseMessage('Followed successfully')
  follow(@Param('id') id: string, @Session() session: UserSession) {
    return this.followsService.follow(session.user.id, id)
  }

  @Delete(':id/follow')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  unfollow(@Param('id') id: string, @Session() session: UserSession) {
    return this.followsService.unfollow(session.user.id, id)
  }

  @Get(':id/followers')
  @ApiOkResponse({ type: [FollowUserEntity] })
  @ResponseMessage('Followers fetched successfully')
  getFollowers(@Param('id') id: string) {
    return this.followsService.getFollowers(id)
  }

  @Get(':id/following')
  @ApiOkResponse({ type: [FollowUserEntity] })
  @ResponseMessage('Following list fetched successfully')
  getFollowing(@Param('id') id: string) {
    return this.followsService.getFollowing(id)
  }
}
