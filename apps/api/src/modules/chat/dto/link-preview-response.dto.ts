import { ApiProperty } from '@nestjs/swagger'

export class LinkPreviewResponseDto {
  @ApiProperty()
  title: string

  @ApiProperty({ required: false })
  description?: string

  @ApiProperty({ required: false })
  siteName?: string

  @ApiProperty({ type: [String], required: false })
  images?: string[]

  @ApiProperty({ required: false })
  image?: string

  @ApiProperty({ required: false })
  url?: string
}
