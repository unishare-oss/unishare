import { ChatMessageType } from '@/generated/prisma/enums'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class ChatMessageUserEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  name: string

  @ApiPropertyOptional({ nullable: true })
  image: string | null
}

export class ChatMessageEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  roomId: string

  @ApiPropertyOptional({ nullable: true })
  userId: string | null

  @ApiProperty({ enum: ChatMessageType })
  type: ChatMessageType

  @ApiPropertyOptional({ nullable: true })
  content: string | null

  @ApiPropertyOptional({ nullable: true })
  imageUrl: string | null

  @ApiPropertyOptional({ nullable: true })
  linkUrl: string | null

  @ApiProperty()
  createdAt: Date

  @ApiProperty()
  updatedAt: Date

  @ApiPropertyOptional({ type: ChatMessageUserEntity })
  user?: ChatMessageUserEntity
}

export class PaginatedMessagesEntity {
  @ApiProperty({ type: [ChatMessageEntity] })
  items: ChatMessageEntity[]

  @ApiPropertyOptional({ nullable: true })
  nextCursor: string | null

  @ApiProperty()
  hasMore: boolean
}
