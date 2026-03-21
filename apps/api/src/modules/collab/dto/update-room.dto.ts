import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator'
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

  @ApiPropertyOptional({
    nullable: true,
    description: 'Set/change password (string) or remove (null)',
  })
  @IsOptional()
  @ValidateIf((o) => o.password !== null)
  @IsString()
  @MinLength(1)
  password?: string | null
}
