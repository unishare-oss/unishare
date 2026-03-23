import { Expose } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class TagDto {
  @ApiProperty()
  @Expose()
  id: string

  @ApiProperty()
  @Expose()
  name: string

  @ApiProperty()
  @Expose()
  slug: string

  @ApiProperty()
  @Expose()
  color: string

  @ApiProperty()
  @Expose()
  createdAt: Date

  @ApiPropertyOptional({ required: false })
  @Expose()
  postCount?: number
}
