import { ApiProperty } from '@nestjs/swagger'

export class PresignedUploadEntity {
  @ApiProperty()
  url: string

  @ApiProperty()
  key: string

  @ApiProperty()
  publicUrl: string
}
