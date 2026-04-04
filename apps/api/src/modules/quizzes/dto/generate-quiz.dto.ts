import { IsInt, IsString, IsOptional, Min, Max } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'

export class GenerateQuestionsDto {
  @ApiProperty({ description: 'Course ID to attach the quiz to' })
  @IsString()
  courseId: string

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsInt()
  @Min(1)
  @Max(100)
  questionCount?: number
}
