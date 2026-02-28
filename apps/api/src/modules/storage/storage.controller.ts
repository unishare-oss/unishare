import { Body, Controller, Post } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Session, UserSession } from '@thallesp/nestjs-better-auth'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { StorageService } from './storage.service'
import { getFolderForPurpose, PresignedUploadDto } from './dto/presigned-upload.dto'
import { PresignedUploadEntity } from './entities/presigned-upload.entity'

@ApiTags('storage')
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('presigned-upload')
  @ResponseMessage('Presigned upload URL generated')
  @ApiOkResponse({ type: PresignedUploadEntity })
  getPresignedUploadUrl(@Body() dto: PresignedUploadDto, @Session() session: UserSession) {
    const folder = getFolderForPurpose(dto.purpose, session.user.id)
    return this.storageService.generatePresignedUploadUrl(folder, dto.mimeType, dto.uploadType)
  }
}
