import { Body, Controller, Get, Param, Patch, Res } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { OptionalAuth, Session } from '@thallesp/nestjs-better-auth'
import type { UserSession } from '@thallesp/nestjs-better-auth'
import type { Response } from 'express'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { UsersService } from './users.service'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { UpdateAcademicProfileDto } from './dto/update-academic-profile.dto'
import { UserProfileEntity } from './entities/user-profile.entity'

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOkResponse({ type: UserProfileEntity })
  @ResponseMessage('Profile fetched successfully')
  getMe(@Session() session: UserSession) {
    return this.usersService.findById(session.user.id)
  }

  @Get('me/export')
  async exportMyData(@Session() session: UserSession, @Res() res: Response) {
    const data = await this.usersService.exportData(session.user.id)
    const filename = `unishare-data-${session.user.id}-${Date.now()}.json`
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(JSON.stringify(data, null, 2))
  }

  @Get(':id')
  @OptionalAuth()
  @ApiOkResponse({ type: UserProfileEntity })
  @ResponseMessage('Profile fetched successfully')
  getById(@Param('id') id: string, @Session() session: UserSession) {
    return this.usersService.findById(id, session?.user?.id)
  }

  @Patch('me')
  @ApiOkResponse({ type: UserProfileEntity })
  @ResponseMessage('Profile updated successfully')
  updateMe(@Session() session: UserSession, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(session.user.id, dto)
  }

  @Patch('me/academic-profile')
  @ApiOkResponse({ type: UserProfileEntity })
  @ResponseMessage('Academic profile updated successfully')
  updateAcademicProfile(@Session() session: UserSession, @Body() dto: UpdateAcademicProfileDto) {
    return this.usersService.updateAcademicProfile(session.user.id, dto)
  }
}
