import { ApiProperty } from '@nestjs/swagger'

export class NotificationEntity {
  @ApiProperty() id: string
  @ApiProperty() type: string
  @ApiProperty() message: string
  @ApiProperty() read: boolean
  @ApiProperty({ type: String, nullable: true }) postId: string | null
  @ApiProperty() createdAt: Date
}
