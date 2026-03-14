import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CommentUserEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  name: string

  @ApiPropertyOptional({ nullable: true, type: String })
  image: string | null
}

export class CommentEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  content: string

  @ApiProperty()
  createdAt: Date

  @ApiProperty()
  updatedAt: Date

  @ApiProperty({ type: CommentUserEntity })
  user: CommentUserEntity
}
