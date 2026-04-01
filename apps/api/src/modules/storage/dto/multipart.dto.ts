import { ApiProperty } from '@nestjs/swagger'
import { IsIn, IsInt, IsString, Max, MaxLength, Min } from 'class-validator'

export class CreateMultipartUploadDto {
  @ApiProperty({ maxLength: 255 })
  @IsString()
  @MaxLength(255)
  mimeType: string

  @ApiProperty({ enum: ['document', 'image', 'video'] })
  @IsIn(['document', 'image', 'video'])
  uploadType: 'document' | 'image' | 'video'

  @ApiProperty({ enum: ['post-attachment'] })
  @IsIn(['post-attachment'])
  purpose: 'post-attachment'
}

export class PresignPartDto {
  @ApiProperty({ maxLength: 500 })
  @IsString()
  @MaxLength(500)
  key: string

  @ApiProperty({ maxLength: 255 })
  @IsString()
  @MaxLength(255)
  uploadId: string

  @ApiProperty({ minimum: 1, maximum: 10000 })
  @IsInt()
  @Min(1)
  @Max(10000)
  partNumber: number
}

export class CompletedPart {
  @ApiProperty()
  @IsInt()
  @Min(1)
  PartNumber: number

  @ApiProperty()
  @IsString()
  ETag: string
}

export class CompleteMultipartUploadDto {
  @ApiProperty({ maxLength: 500 })
  @IsString()
  @MaxLength(500)
  key: string

  @ApiProperty({ maxLength: 255 })
  @IsString()
  @MaxLength(255)
  uploadId: string

  @ApiProperty({ type: [CompletedPart] })
  parts: CompletedPart[]
}

export class AbortMultipartUploadDto {
  @ApiProperty({ maxLength: 500 })
  @IsString()
  @MaxLength(500)
  key: string

  @ApiProperty({ maxLength: 255 })
  @IsString()
  @MaxLength(255)
  uploadId: string
}
