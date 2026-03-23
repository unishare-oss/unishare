import { IsOptional, IsString, IsInt, Min, Max, IsIn } from 'class-validator'
import { Type } from 'class-transformer'

export class ListMessagesQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20

  @IsOptional()
  @IsIn(['asc', 'desc'])
  direction?: 'asc' | 'desc' = 'desc'
}
