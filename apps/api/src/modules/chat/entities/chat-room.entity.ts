import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ChatMessageEntity, ChatMessageUserEntity } from './chat-message.entity'
import { ChatRoomType } from '@/generated/prisma/enums'

export class ChatRoomParticipantEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  roomId: string

  @ApiProperty()
  userId: string

  @ApiProperty()
  lastReadAt: Date

  @ApiProperty()
  joinedAt: Date

  @ApiProperty({ type: ChatMessageUserEntity })
  user: ChatMessageUserEntity
}

export class ChatRoomEntity {
  @ApiProperty()
  id: string

  @ApiProperty({ enum: ChatRoomType })
  type: ChatRoomType

  @ApiPropertyOptional({ type: String, nullable: true })
  name: string | null

  @ApiPropertyOptional({ type: String, nullable: true })
  imageUrl: string | null

  @ApiProperty()
  createdAt: Date

  @ApiProperty()
  updatedAt: Date

  @ApiProperty({ type: [ChatRoomParticipantEntity] })
  participants: ChatRoomParticipantEntity[]

  @ApiPropertyOptional({ type: [ChatMessageEntity] })
  messages?: ChatMessageEntity[]
}
