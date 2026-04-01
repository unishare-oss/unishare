import { ApiProperty } from '@nestjs/swagger'

export class MultipartUploadEntity {
  @ApiProperty()
  uploadId: string

  @ApiProperty()
  key: string
}

export class PresignedPartEntity {
  @ApiProperty()
  url: string
}
