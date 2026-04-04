import { IsString, IsInt, IsArray, IsOptional, IsEnum, Min, Max } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateQuestionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[]

  @ApiPropertyOptional({ minimum: 0, maximum: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3)
  correctAnswer?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  explanation?: string

  @ApiPropertyOptional({ enum: ['easy', 'medium', 'hard'] })
  @IsOptional()
  @IsEnum(['easy', 'medium', 'hard'])
  difficulty?: 'easy' | 'medium' | 'hard'
}
