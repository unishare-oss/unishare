import { ApiProperty } from '@nestjs/swagger'

export class DownloadUrlEntity {
  @ApiProperty()
  url: string
}
