import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsInt, IsOptional, IsString, IsUrl, Max, Min, MaxLength } from 'class-validator'

export class UpdateProfileDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string

  @ApiPropertyOptional({ maxLength: 500, format: 'uri' })
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(500)
  image?: string

  @ApiPropertyOptional({ minimum: 1950, maximum: 2100 })
  @IsOptional()
  @IsInt()
  @Min(1950)
  @Max(2100)
  enrollmentYear?: number
}
