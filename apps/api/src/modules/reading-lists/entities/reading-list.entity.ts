import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class ReadingListEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  userId: string

  @ApiProperty()
  name: string

  @ApiPropertyOptional({ nullable: true, type: String })
  description: string | null

  @ApiProperty()
  isPublic: boolean

  @ApiProperty()
  postCount: number

  @ApiProperty({ type: [String] })
  postIds: string[]

  @ApiProperty()
  createdAt: Date

  @ApiProperty()
  updatedAt: Date
}
