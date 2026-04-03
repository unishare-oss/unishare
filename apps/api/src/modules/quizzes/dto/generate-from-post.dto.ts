import { IsInt, IsString, IsOptional, Min, Max } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'

export class GenerateFromPostDto {
  @ApiProperty({ description: 'Post ID with an AI summary to generate quiz from' })
  @IsString()
  postId: string

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsInt()
  @Min(1)
  @Max(100)
  questionCount?: number
}
