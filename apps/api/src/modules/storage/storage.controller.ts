import { Body, Controller, Delete, Post } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Session, UserSession } from '@thallesp/nestjs-better-auth'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { StorageService } from './storage.service'
import { getFolderForPurpose, PresignedUploadDto } from './dto/presigned-upload.dto'
import { PresignedUploadEntity } from './entities/presigned-upload.entity'
import { MultipartUploadEntity, PresignedPartEntity } from './entities/multipart.entity'
import {
  AbortMultipartUploadDto,
  CompleteMultipartUploadDto,
  CreateMultipartUploadDto,
  PresignPartDto,
} from './dto/multipart.dto'

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

  @Post('multipart/create')
  @ResponseMessage('Multipart upload created')
  @ApiOkResponse({ type: MultipartUploadEntity })
  createMultipartUpload(@Body() dto: CreateMultipartUploadDto, @Session() session: UserSession) {
    const folder = getFolderForPurpose(dto.purpose, session.user.id)
    return this.storageService.createMultipartUpload(folder, dto.mimeType, dto.uploadType)
  }

  @Post('multipart/presign-part')
  @ResponseMessage('Part presigned URL generated')
  @ApiOkResponse({ type: PresignedPartEntity })
  async presignPart(@Body() dto: PresignPartDto) {
    const url = await this.storageService.presignUploadPart(dto.key, dto.uploadId, dto.partNumber)
    return { url }
  }

  @Post('multipart/complete')
  @ResponseMessage('Multipart upload completed')
  completeMultipartUpload(@Body() dto: CompleteMultipartUploadDto) {
    return this.storageService.completeMultipartUpload(dto.key, dto.uploadId, dto.parts)
  }

  @Delete('multipart/abort')
  @ResponseMessage('Multipart upload aborted')
  abortMultipartUpload(@Body() dto: AbortMultipartUploadDto) {
    return this.storageService.abortMultipartUpload(dto.key, dto.uploadId)
  }
}
