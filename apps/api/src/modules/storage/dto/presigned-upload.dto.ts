import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsIn, IsOptional, IsString, Matches, MaxLength, ValidateIf } from 'class-validator'

export type UploadPurpose =
  | 'profile-picture'
  | 'post-attachment'
  | 'chat-attachment'
  | 'group-picture'
  | 'board-attachment'
  | 'course-outline'

const UPLOAD_PURPOSE_FOLDER: Record<Exclude<UploadPurpose, 'board-attachment'>, string> = {
  'profile-picture': 'profile',
  'post-attachment': 'posts',
  'chat-attachment': 'chat',
  'group-picture': 'groups',
  'course-outline': 'course-outlines',
}

/** Board attachments are scoped by room, not by uploader — see docs/board-e2e-encryption/planning.md. */
export function getFolderForPurpose(
  purpose: UploadPurpose,
  scope: { userId: string; roomSlug?: string },
): string {
  if (purpose === 'board-attachment') {
    return `boards/${scope.roomSlug}`
  }
  return `${UPLOAD_PURPOSE_FOLDER[purpose]}/${scope.userId}`
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

  @ApiProperty({ enum: ['document', 'image', 'video', 'encrypted-blob'] })
  @IsIn(['document', 'image', 'video', 'encrypted-blob'])
  uploadType: 'document' | 'image' | 'video' | 'encrypted-blob'

  @ApiProperty({
    enum: [
      'profile-picture',
      'post-attachment',
      'chat-attachment',
      'group-picture',
      'board-attachment',
      'course-outline',
    ],
  })
  @IsIn([
    'profile-picture',
    'post-attachment',
    'chat-attachment',
    'group-picture',
    'board-attachment',
    'course-outline',
  ])
  purpose: UploadPurpose

  @ApiPropertyOptional({
    description: 'Room slug — required when purpose is board-attachment, scopes the S3 folder',
  })
  @ValidateIf((o) => o.purpose === 'board-attachment')
  @IsString()
  @MaxLength(64)
  roomSlug?: string

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
