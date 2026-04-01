import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { FeedbackType } from '@/generated/prisma/client'

export class ListFeedbackDto {
  @ApiPropertyOptional({ enum: FeedbackType, description: 'Filter by feedback type' })
  @IsOptional()
  @IsEnum(FeedbackType)
  type?: FeedbackType

  @ApiPropertyOptional({ type: Number, description: 'Page number (1-indexed)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @ApiPropertyOptional({ type: Number, description: 'Results per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20
}
