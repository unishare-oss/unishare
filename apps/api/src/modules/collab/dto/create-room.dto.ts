import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator'
import { RoomVisibility } from '@/generated/prisma/client'

export class CreateCollabRoomDto {
  @ApiPropertyOptional({ description: 'Optional room title', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string

  @ApiPropertyOptional({ enum: RoomVisibility, description: 'Room visibility (default: OPEN)' })
  @IsOptional()
  @IsEnum(RoomVisibility)
  visibility?: RoomVisibility

  @ApiPropertyOptional({ description: 'Optional password to protect room on creation' })
  @ValidateIf((o) => o.password !== undefined && o.password !== null)
  @IsString()
  @MinLength(1)
  password?: string
}
