import { IsIn, IsString, Matches, MaxLength } from 'class-validator'

export class PresignedUploadDto {
  @IsString()
  @MaxLength(255)
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_.+]*$/, {
    message: 'mimeType must be a valid MIME type format',
  })
  mimeType: string

  @IsIn(['document', 'image'])
  uploadType: 'document' | 'image'
}
