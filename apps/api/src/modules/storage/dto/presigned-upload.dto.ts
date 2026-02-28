import { ApiProperty } from '@nestjs/swagger'
import { IsIn, IsString, Matches, MaxLength } from 'class-validator'

export type UploadPurpose = 'profile-picture' | 'post-attachment'

const UPLOAD_PURPOSE_FOLDER: Record<UploadPurpose, string> = {
  'profile-picture': 'profile',
  'post-attachment': 'posts',
}

export function getFolderForPurpose(purpose: UploadPurpose, userId: string): string {
  return `${UPLOAD_PURPOSE_FOLDER[purpose]}/${userId}`
}

export class PresignedUploadDto {
  @IsString()
  @MaxLength(255)
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_.+]*$/, {
    message: 'mimeType must be a valid MIME type format',
  })
  mimeType: string

  @IsIn(['document', 'image'])
  uploadType: 'document' | 'image'

  @ApiProperty({ enum: ['profile-picture', 'post-attachment'] })
  @IsIn(['profile-picture', 'post-attachment'])
  purpose: UploadPurpose
}
