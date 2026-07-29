import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator'

export type UploadPurpose =
  'profile-picture' | 'post-attachment' | 'chat-attachment' | 'group-picture'

const UPLOAD_PURPOSE_FOLDER: Record<UploadPurpose, string> = {
  'profile-picture': 'profile',
  'post-attachment': 'posts',
  'chat-attachment': 'chat',
  'group-picture': 'groups',
}

export function getFolderForPurpose(purpose: UploadPurpose, userId: string): string {
  return `${UPLOAD_PURPOSE_FOLDER[purpose]}/${userId}`
}

export class PresignedUploadDto {
  @ApiProperty({
    maxLength: 255,
    pattern: '^[a-zA-Z0-9][a-zA-Z0-9!#$&\\-^_]*\\/[a-zA-Z0-9][a-zA-Z0-9!#$&\\-^_.+]*$',
  })
  @IsString()
  @MaxLength(255)
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_.+]*$/, {
    message: 'mimeType must be a valid MIME type format',
  })
  mimeType: string

  @ApiProperty({ enum: ['document', 'image', 'video'] })
  @IsIn(['document', 'image', 'video'])
  uploadType: 'document' | 'image' | 'video'

  @ApiProperty({ enum: ['profile-picture', 'post-attachment', 'chat-attachment', 'group-picture'] })
  @IsIn(['profile-picture', 'post-attachment', 'chat-attachment', 'group-picture'])
  purpose: UploadPurpose

  @ApiPropertyOptional({
    description: 'Base64-encoded SHA-256 of the file body, verified by storage on upload.',
    example: 'eWPfwx9oFQy+i82Q9/7n0jdzN2qLAM0XGuurO4CgUmk=',
  })
  @IsOptional()
  @Matches(/^[A-Za-z0-9+/]{43}=$/, {
    message: 'checksumSha256 must be a base64-encoded SHA-256 digest',
  })
  checksumSha256?: string
}
