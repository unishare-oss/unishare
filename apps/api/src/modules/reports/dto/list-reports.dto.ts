import { IsEnum, IsOptional, IsNumber, Min } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { ReportReason, ReportStatus } from '@/generated/prisma/client'

export class ListReportsDto {
  @ApiPropertyOptional({ enum: ReportStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus

  @ApiPropertyOptional({ enum: ReportReason, description: 'Filter by reason' })
  @IsOptional()
  @IsEnum(ReportReason)
  reason?: ReportReason

  @ApiPropertyOptional({ type: Number, description: 'Page number (1-indexed)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number

  @ApiPropertyOptional({ type: Number, description: 'Results per page' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number
}
