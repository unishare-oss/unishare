import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class CreateCommentDto {
  @ApiProperty({ minLength: 1, maxLength: 2000 })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string

  @ApiPropertyOptional({
    description: 'Parent comment ID when creating a nested reply.',
  })
  @IsOptional()
  @IsString()
  parentId?: string
}
