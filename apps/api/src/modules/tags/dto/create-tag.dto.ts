import { IsString, MinLength, MaxLength, Matches, IsOptional } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateTagDto {
  @ApiProperty({ example: 'Linear Algebra' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9\s\-&()]{2,50}$/i, {
    message: 'Tag must contain only letters, numbers, spaces, hyphens, ampersand, and parentheses',
  })
  name: string

  @ApiPropertyOptional({ required: false, example: '#3B82F6' })
  @IsOptional()
  @IsString()
  color?: string
}
