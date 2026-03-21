import { ApiProperty } from '@nestjs/swagger'
import { IsEnum } from 'class-validator'
import { RoomVisibility } from '@/generated/prisma/client'

export class UpdateRoomDto {
  @ApiProperty({ enum: ['OPEN', 'VIEW_ONLY', 'PRIVATE'] })
  @IsEnum(RoomVisibility)
  visibility: RoomVisibility
}
