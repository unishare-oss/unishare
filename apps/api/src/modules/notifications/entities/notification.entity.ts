import { ApiProperty } from '@nestjs/swagger'
import { NotificationType } from '@/generated/prisma/client'

export class NotificationEntity {
  @ApiProperty() id: string
  @ApiProperty({ enum: NotificationType }) type: NotificationType
  @ApiProperty() message: string
  @ApiProperty() read: boolean
  @ApiProperty({ type: String, nullable: true }) postId: string | null
  @ApiProperty({ type: String, nullable: true }) requestId: string | null
  @ApiProperty({ type: String, nullable: true }) chatRoomId: string | null
  @ApiProperty({ type: String, nullable: true }) examId: string | null
  @ApiProperty({ type: String, nullable: true }) commentId: string | null
  @ApiProperty() createdAt: Date
}
