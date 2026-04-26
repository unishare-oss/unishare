import { IsString, IsOptional, MinLength, MaxLength, IsUrl } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateChatRoomDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 50 })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @IsOptional()
  name?: string

  @ApiPropertyOptional({ maxLength: 500 })
  @IsUrl({ protocols: ['https'] })
  @MaxLength(500)
  @IsOptional()
  imageUrl?: string
}
