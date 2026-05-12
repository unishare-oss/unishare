import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class PresenceStatusDto {
  @ApiProperty()
  userId: string

  @ApiProperty({ enum: [0, 1] })
  status: 0 | 1

  @ApiPropertyOptional()
  lastSeen?: number
}
