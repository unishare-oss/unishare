import { ApiProperty } from '@nestjs/swagger'

export class FileEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  key: string

  @ApiProperty()
  name: string

  @ApiProperty()
  size: number

  @ApiProperty()
  mimeType: string

  @ApiProperty()
  postId: string

  @ApiProperty()
  createdAt: Date
}
