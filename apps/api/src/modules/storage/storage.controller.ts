import { Body, Controller, Post } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Session, UserSession } from '@thallesp/nestjs-better-auth'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { StorageService } from './storage.service'
import { PresignedUploadDto } from './dto/presigned-upload.dto'

@ApiTags('storage')
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('presigned-upload')
  @ResponseMessage('Presigned upload URL generated')
  getPresignedUploadUrl(@Body() dto: PresignedUploadDto, @Session() session: UserSession) {
    const folder = `posts/${session.user.id}`
    return this.storageService.generatePresignedUploadUrl(folder, dto.mimeType, dto.uploadType)
  }
}
