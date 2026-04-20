import { ChatMessageType } from '@/generated/prisma/enums'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class ChatMessageUserEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  name: string

  @ApiPropertyOptional({ type: String, nullable: true })
  image: string | null

  @ApiPropertyOptional({ type: String, nullable: true })
  publicKey: string | null
}

export class ChatMessageParentEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  roomId: string

  @ApiPropertyOptional({ type: String, nullable: true })
  userId: string | null

  @ApiProperty({ enum: ChatMessageType })
  type: ChatMessageType

  @ApiPropertyOptional({ type: String, nullable: true })
  content: string | null

  @ApiPropertyOptional({ type: String, nullable: true })
  imageUrl: string | null

  @ApiPropertyOptional({ type: String, nullable: true })
  fileUrl: string | null

  @ApiPropertyOptional({ type: String, nullable: true })
  fileName: string | null

  @ApiPropertyOptional({ type: String, nullable: true })
  linkUrl: string | null

  @ApiPropertyOptional({ type: String, nullable: true })
  parentId: string | null

  @ApiProperty()
  createdAt: Date

  @ApiProperty()
  updatedAt: Date

  @ApiPropertyOptional({ type: String, nullable: true })
  deletedAt: Date | null

  @ApiPropertyOptional({ type: ChatMessageUserEntity })
  user?: ChatMessageUserEntity
}

export class ChatMessageEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  roomId: string

  @ApiPropertyOptional({ type: String, nullable: true })
  userId: string | null

  @ApiProperty({ enum: ChatMessageType })
  type: ChatMessageType

  @ApiPropertyOptional({ type: String, nullable: true })
  content: string | null

  @ApiPropertyOptional({ type: String, nullable: true })
  imageUrl: string | null

  @ApiPropertyOptional({ type: String, nullable: true })
  fileUrl: string | null

  @ApiPropertyOptional({ type: String, nullable: true })
  fileName: string | null

  @ApiPropertyOptional({ type: String, nullable: true })
  linkUrl: string | null

  @ApiPropertyOptional({ type: String, nullable: true })
  parentId: string | null

  @ApiProperty()
  createdAt: Date

  @ApiProperty()
  updatedAt: Date

  @ApiPropertyOptional({ type: String, nullable: true })
  deletedAt: Date | null

  @ApiPropertyOptional({ type: ChatMessageUserEntity })
  user?: ChatMessageUserEntity

  @ApiPropertyOptional({ type: ChatMessageParentEntity })
  parent?: ChatMessageParentEntity
}

export class PaginatedMessagesEntity {
  @ApiProperty({ type: [ChatMessageEntity] })
  items: ChatMessageEntity[]

  @ApiPropertyOptional({ type: String, nullable: true })
  nextCursor: string | null

  @ApiProperty()
  hasMore: boolean
}
