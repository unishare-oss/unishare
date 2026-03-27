import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateReadingListDto {
  @ApiProperty({ example: 'Finals Revision' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string

  @ApiPropertyOptional({ example: 'Materials for final exam prep' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean
}
