import { Type } from 'class-transformer'
import { IsInt, IsOptional, Max, Min } from 'class-validator'

export const PRACTICE_QUIZ_DEFAULT_COUNT = 3
export const PRACTICE_QUIZ_MAX_COUNT = 5

export class PracticeQuizDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PRACTICE_QUIZ_MAX_COUNT)
  count?: number
}
