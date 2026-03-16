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

  @ApiPropertyOptional({ nullable: true, type: String })
  parentId: string | null

  @ApiPropertyOptional({ nullable: true, type: Date })
  deletedAt: Date | null

  @ApiProperty()
  createdAt: Date

  @ApiProperty()
  updatedAt: Date

  @ApiProperty({ type: CommentUserEntity })
  user: CommentUserEntity

  @ApiPropertyOptional({
    type: () => [CommentEntity],
    description: 'Nested replies for this comment.',
  })
  children?: CommentEntity[]
}
