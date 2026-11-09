import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common'
import {
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger'
import { Roles, Session } from '@thallesp/nestjs-better-auth'
import type { UserSession } from '@thallesp/nestjs-better-auth'
import type { UserSession as AppUserSession } from '@/auth/auth.config'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { UsersService } from './users.service'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { UpdateAcademicProfileDto } from './dto/update-academic-profile.dto'
import { UpdatePublicKeyDto } from './dto/update-public-key.dto'
import { UpdateKeyBackupDto } from './dto/update-key-backup.dto'
import { SetGuestUniversityDto } from './dto/set-guest-university.dto'
import { UserProfileEntity } from './entities/user-profile.entity'

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOkResponse({ type: UserProfileEntity })
  @ResponseMessage('Profile fetched successfully')
  getMe(@Session() session: UserSession) {
    return this.usersService.findById(session.user.id, session.user.id)
  }

  @Get('me/export')
  @ResponseMessage('Data exported successfully')
  exportMyData(@Session() session: UserSession) {
    return this.usersService.exportData(session.user.id)
  }

  /** Compatibility endpoint: confirms shared acceptance recorded on UniAuth. */
  @Post('me/consent')
  @HttpCode(200)
  @ResponseMessage('Consent recorded')
  async giveConsent(@Session() session: UserSession) {
    await this.usersService.giveConsent(session.user.id)
    return null
  }

  @Get(':id')
  @ApiOkResponse({ type: UserProfileEntity })
  @ResponseMessage('Profile fetched successfully')
  getById(@Param('id') id: string, @Session() session: UserSession) {
    return this.usersService.findById(id, session.user.id)
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
  updateAcademicProfile(@Session() session: AppUserSession, @Body() dto: UpdateAcademicProfileDto) {
    return this.usersService.updateAcademicProfile(session.user, dto)
  }

  @Patch('me/guest-university')
  @ApiOkResponse({ type: UserProfileEntity })
  @ApiForbiddenResponse({ description: 'Not a guest' })
  @ApiNotFoundResponse({ description: 'University not found' })
  @ApiConflictResponse({ description: 'The guest already picked a university' })
  @ResponseMessage('University picked successfully')
  setGuestUniversity(@Session() session: AppUserSession, @Body() dto: SetGuestUniversityDto) {
    return this.usersService.setGuestUniversity(session.user, dto.universityId)
  }

  @Patch('me/public-key')
  @ResponseMessage('Public key updated successfully')
  updatePublicKey(@Session() session: AppUserSession, @Body() dto: UpdatePublicKeyDto) {
    return this.usersService.updatePublicKey(session.user, dto.publicKey)
  }

  @Delete('me/public-key')
  @ApiOkResponse({ description: 'Encryption keys cleared' })
  @ResponseMessage('Encryption keys cleared successfully')
  clearMyKeys(@Session() session: UserSession) {
    return this.usersService.clearMyKeys(session.user.id)
  }

  @Patch('me/key-backup')
  @ResponseMessage('Key backup stored successfully')
  updateKeyBackup(@Session() session: AppUserSession, @Body() dto: UpdateKeyBackupDto) {
    return this.usersService.updateKeyBackup(session.user, dto.keyBackup)
  }

  @Get('me/key-backup')
  @ResponseMessage('Key backup fetched successfully')
  getKeyBackup(@Session() session: UserSession) {
    return this.usersService.getKeyBackup(session.user.id)
  }

  @Delete('me/key-backup')
  @ResponseMessage('Key backup deleted successfully')
  clearKeyBackup(@Session() session: UserSession) {
    return this.usersService.clearKeyBackup(session.user.id)
  }

  @Delete('admin/public-keys')
  @Roles(['ADMIN'])
  @ResponseMessage('All public keys cleared successfully')
  clearAllPublicKeys() {
    return this.usersService.clearAllPublicKeys()
  }
}
