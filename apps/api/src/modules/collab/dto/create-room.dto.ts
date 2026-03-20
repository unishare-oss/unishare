import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, MaxLength } from 'class-validator'

export class CreateRoomDto {
  @ApiPropertyOptional({ description: 'Optional room title', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string
}
