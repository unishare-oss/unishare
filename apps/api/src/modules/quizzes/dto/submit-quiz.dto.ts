import { IsString, IsInt, IsArray, ValidateNested, IsOptional, Min, Max } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'

export class SubmitQuizAnswerDto {
  @ApiProperty()
  @IsString()
  questionId: string

  @ApiProperty({ nullable: true, type: Number })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3)
  answerIndex: number | null
}

export class SubmitQuizDto {
  @ApiProperty({ type: [SubmitQuizAnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitQuizAnswerDto)
  answers: SubmitQuizAnswerDto[]

  @ApiPropertyOptional({ description: 'Total time spent in seconds' })
  @IsOptional()
  @IsInt()
  @Min(0)
  timeSpentSec?: number
}
