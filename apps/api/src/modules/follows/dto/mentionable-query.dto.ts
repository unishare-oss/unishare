import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, MaxLength } from 'class-validator'

export class MentionableQueryDto {
  @ApiPropertyOptional({ maxLength: 50, description: 'Name prefix to match.' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  q?: string
}
