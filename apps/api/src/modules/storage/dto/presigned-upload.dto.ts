import { IsIn, IsString } from 'class-validator'

export class PresignedUploadDto {
  @IsString()
  mimeType: string

  @IsIn(['document', 'image'])
  uploadType: 'document' | 'image'
}
