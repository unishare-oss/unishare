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
  userId: string

  @ApiProperty()
  postId: string

  @ApiProperty()
  createdAt: Date

  @ApiProperty()
  updatedAt: Date

  @ApiPropertyOptional({ nullable: true, type: Date })
  deletedAt: Date | null

  @ApiProperty({ type: CommentUserEntity })
  user: CommentUserEntity
}
