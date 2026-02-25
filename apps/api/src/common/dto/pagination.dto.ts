import { IsInt, IsOptional, Max, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { PAGINATION_DEFAULT_LIMIT, PAGINATION_MAX_LIMIT } from '@unishare/types'

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAGINATION_MAX_LIMIT)
  limit?: number = PAGINATION_DEFAULT_LIMIT
}
