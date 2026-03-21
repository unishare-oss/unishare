import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsOptional, IsString } from 'class-validator'
import { RoomVisibility } from '@/generated/prisma/client'

export class UpdateRoomDto {
  @ApiPropertyOptional({ enum: ['OPEN', 'VIEW_ONLY', 'PRIVATE'] })
  @IsOptional()
  @IsEnum(RoomVisibility)
  visibility?: RoomVisibility

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string
}
